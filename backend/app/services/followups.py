from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SurgeonInstruction, User
from app.schemas.prediction import PredictionRead
from app.services.prediction import predict_crew_risk

FOLLOWUP_DEDUP_WINDOW = timedelta(hours=12)


@dataclass
class FollowupPlan:
    protocol: str
    message: str
    target_metrics: list[str]
    reason: str
    due_hours: int


def _codes(prediction: PredictionRead) -> set[str]:
    return {driver.metric for driver in prediction.drivers}


def plan_followup(prediction: PredictionRead) -> FollowupPlan | None:
    if prediction.risk_level == "low" and not prediction.red_flags:
        return None

    codes = _codes(prediction)
    top_evidence = (
        prediction.drivers[0].evidence if prediction.drivers else prediction.summary
    )

    if prediction.red_flags or "symptom_score" in codes:
        return FollowupPlan(
            protocol="urgent_recheck",
            message=(
                "The system detected a red-flag pattern. Please repeat your temperature, "
                "heart rate, and oxygen saturation now, and record any chest pain, "
                "breathlessness, or vision change. Contact the flight surgeon on the next "
                "comms window. This is an Automated follow-up, not a diagnosis."
            ),
            target_metrics=["body_temp_c", "heart_rate", "spo2", "symptom_score"],
            reason="; ".join(prediction.red_flags) if prediction.red_flags else top_evidence,
            due_hours=4,
        )

    if codes & {"systolic_bp", "diastolic_bp", "orthostatic_hr_rise", "heart_rate"}:
        return FollowupPlan(
            protocol="cardiovascular_recheck",
            message=(
                "Please complete a focused cardiovascular check: rest for five minutes, "
                "record blood pressure and heart rate, then record the heart-rate rise "
                "after standing for one minute. Note any dizziness. This is an Automated "
                "follow-up, not a diagnosis."
            ),
            target_metrics=["systolic_bp", "diastolic_bp", "heart_rate", "orthostatic_hr_rise"],
            reason=top_evidence,
            due_hours=12,
        )

    if "spo2" in codes:
        return FollowupPlan(
            protocol="respiratory_recheck",
            message=(
                "Please repeat oxygen saturation at rest and after two minutes of quiet "
                "breathing, and record any cough, breathlessness, or chest discomfort. "
                "This is an Automated follow-up, not a diagnosis."
            ),
            target_metrics=["spo2", "heart_rate", "symptom_score"],
            reason=top_evidence,
            due_hours=6,
        )

    if codes & {"body_temp_c", "symptom_score"}:
        return FollowupPlan(
            protocol="vital_recheck",
            message=(
                "Please repeat your temperature, heart rate, and symptom check. Record the "
                "time and any new symptoms. This is an Automated follow-up, not a diagnosis."
            ),
            target_metrics=["body_temp_c", "heart_rate", "symptom_score"],
            reason=top_evidence,
            due_hours=8,
        )

    if codes & {
        "hrv_rmssd",
        "sleep_efficiency_pct",
        "sleep_duration_h",
        "sleep_latency_min",
        "stress_score",
    }:
        return FollowupPlan(
            protocol="recovery_check",
            message=(
                "Please complete a focused recovery check: log last night's sleep, repeat "
                "HRV and resting heart rate tomorrow morning, and record hydration. Protect "
                "the sleep window tonight. This is an Automated follow-up, not a diagnosis."
            ),
            target_metrics=["sleep_duration_h", "sleep_efficiency_pct", "hrv_rmssd", "hydration_l"],
            reason=top_evidence,
            due_hours=24,
        )

    if codes & {"mood_score", "social_interaction_score"}:
        return FollowupPlan(
            protocol="mood_check",
            message=(
                "Please complete a private mood and crew-contact check. There is no right "
                "answer; the flight surgeon will review it with you. This is an Automated "
                "follow-up, not a diagnosis."
            ),
            target_metrics=["mood_score", "stress_score", "social_interaction_score"],
            reason=top_evidence,
            due_hours=24,
        )

    if codes & {"hydration_l", "caloric_intake"}:
        return FollowupPlan(
            protocol="hydration_check",
            message=(
                "Please log your fluid and energy intake for today and repeat the hydration "
                "reading. This is an Automated follow-up, not a diagnosis."
            ),
            target_metrics=["hydration_l", "caloric_intake"],
            reason=top_evidence,
            due_hours=12,
        )

    if codes & {"exercise_load_min", "bone_load_min"}:
        return FollowupPlan(
            protocol="training_check",
            message=(
                "Please review this week's loading plan, record the next prescribed "
                "session, and note any pain or limitation. This is an Automated "
                "follow-up, not a diagnosis."
            ),
            target_metrics=["exercise_load_min", "bone_load_min", "strength_check"],
            reason=top_evidence,
            due_hours=24,
        )

    return None


def ensure_ai_followup(
    db: Session,
    member: User,
    now: datetime | None = None,
) -> SurgeonInstruction | None:
    """Create one deduplicated Follow-up request when an anomaly is present.

    The request is attributed to the supervising flight surgeon, marked as
    Automated, and asks for a specific focused check. It never diagnoses or
    prescribes.
    """
    now = now or datetime.now(UTC)
    prediction = predict_crew_risk(db, member, now)
    plan = plan_followup(prediction)
    if plan is None:
        return None

    last = db.scalar(
        select(SurgeonInstruction)
        .where(
            SurgeonInstruction.crew_user_id == member.id,
            SurgeonInstruction.source == "ai",
            SurgeonInstruction.protocol == plan.protocol,
        )
        .order_by(SurgeonInstruction.created_at.desc())
        .limit(1)
    )
    if last is not None:
        if last.status in {"open", "acknowledged"}:
            return last
        if last.created_at is not None:
            created = last.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=UTC)
            if now - created < FOLLOWUP_DEDUP_WINDOW:
                return last

    surgeon = db.scalar(
        select(User).where(User.role == "flight_surgeon").order_by(User.id).limit(1)
    )
    if surgeon is None:
        return None

    instruction = SurgeonInstruction(
        surgeon_id=surgeon.id,
        crew_user_id=member.id,
        kind="focused_check",
        message=plan.message,
        status="open",
        source="ai",
        protocol=plan.protocol,
        target_metrics=plan.target_metrics,
        due_at=now + timedelta(hours=plan.due_hours),
        reason=plan.reason,
    )
    db.add(instruction)
    db.commit()
    db.refresh(instruction)
    return instruction
