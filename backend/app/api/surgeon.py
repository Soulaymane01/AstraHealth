import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_surgeon
from app.db.session import get_db
from app.models import (
    Alert,
    Checkin,
    Crew,
    Measurement,
    MetricDefinition,
    Mission,
    ReadinessSnapshot,
    SurgeonAssessment,
    SurgeonInstruction,
    User,
)
from app.schemas import (
    AlertRead,
    AssistantAnswerRead,
    AssistantQuestion,
    CaptureFeedRead,
    CheckinRead,
    MeasurementRead,
    MetricSeriesRead,
    PredictionRead,
    ReadinessSnapshotRead,
    SurgeonAssessmentCreate,
    SurgeonAssessmentRead,
    SurgeonCrewDetailRead,
    SurgeonCrewSummaryRead,
    SurgeonInstructionCreate,
    SurgeonInstructionRead,
    SurgeonMissionRead,
    SurgeonUpdatesRead,
)
from app.services.captures import (
    CAPTURE_SOURCES,
    build_capture_feed,
    simulate_capture,
)
from app.services.followups import ensure_ai_followup
from app.services.prediction import predict_crew_risk
from app.services.readiness import (
    SEVERITY_ORDER,
    compute_and_persist_readiness,
    profile_for_user,
)
from app.services.surgeon import assessment_read, crew_updates, instruction_read
from app.services.surgeon_assistant import answer_surgeon_question
from app.services.telemetry import TELEMETRY_RANGES, build_metric_series
from app.services.training import alert_read, training_items_map

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/surgeon", tags=["surgeon"])

COMMS_DELAY_MINUTES = {
    "mars_transit": 14.0,
    "lunar_surface": 0.05,
    "station": 0.0,
}


def _crew_members(db: Session) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .where(User.crew_id.is_not(None), User.role != "flight_surgeon")
            .order_by(User.full_name)
        ).all()
    )


def _crew_member(db: Session, crew_user_id: int) -> User:
    member = db.scalar(
        select(User).where(
            User.id == crew_user_id,
            User.crew_id.is_not(None),
            User.role != "flight_surgeon",
        )
    )
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Crew member not found"
        )
    return member


def _latest_snapshot(db: Session, user_id: int) -> ReadinessSnapshot | None:
    return db.scalar(
        select(ReadinessSnapshot)
        .where(ReadinessSnapshot.user_id == user_id)
        .order_by(ReadinessSnapshot.computed_at.desc())
        .limit(1)
    )


def _active_alert_counts(db: Session, user_id: int) -> tuple[int, int]:
    total = db.scalar(
        select(func.count(Alert.id)).where(
            Alert.user_id == user_id, Alert.status == "active"
        )
    )
    critical = db.scalar(
        select(func.count(Alert.id)).where(
            Alert.user_id == user_id,
            Alert.status == "active",
            Alert.severity == "critical",
        )
    )
    return int(total or 0), int(critical or 0)


def _last_checkin_at(db: Session, user_id: int) -> datetime | None:
    return db.scalar(
        select(func.max(Checkin.completed_at)).where(Checkin.user_id == user_id)
    )


def _summary(
    db: Session,
    member: User,
    prediction: PredictionRead | None = None,
) -> SurgeonCrewSummaryRead:
    snapshot = _latest_snapshot(db, member.id)
    risk = prediction or predict_crew_risk(db, member)
    active, critical = _active_alert_counts(db, member.id)
    last_capture = db.scalar(
        select(Measurement)
        .where(
            Measurement.user_id == member.id,
            Measurement.source.in_(CAPTURE_SOURCES),
            Measurement.notes.like("Simulated %"),
        )
        .order_by(Measurement.measured_at.desc())
        .limit(1)
    )
    open_instructions = db.scalar(
        select(func.count(SurgeonInstruction.id)).where(
            SurgeonInstruction.crew_user_id == member.id,
            SurgeonInstruction.status == "open",
        )
    )
    return SurgeonCrewSummaryRead(
        id=member.id,
        full_name=member.full_name,
        role=member.role,
        avatar_seed=member.avatar_seed,
        readiness_score=snapshot.score if snapshot else None,
        readiness_status=snapshot.status if snapshot else None,
        active_alerts=active,
        critical_alerts=critical,
        last_capture_at=last_capture.measured_at if last_capture else None,
        last_capture_source=last_capture.source if last_capture else None,
        last_checkin_at=_last_checkin_at(db, member.id),
        open_instructions=int(open_instructions or 0),
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        risk_horizon_hours=risk.horizon_hours,
    )


def _mission_for_member(db: Session, member: User) -> SurgeonMissionRead:
    if member.crew_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No crew assigned"
        )
    crew = db.get(Crew, member.crew_id)
    mission = db.get(Mission, crew.mission_id) if crew else None
    if mission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found"
        )
    now = datetime.now(UTC)
    start_at = mission.start_at
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=UTC)
    day = max(1, int((now - start_at).total_seconds() // 86400))
    return SurgeonMissionRead(
        id=mission.id,
        name=mission.name,
        profile=mission.profile,
        environment=mission.environment,
        mission_day=day,
        comms_delay_min=COMMS_DELAY_MINUTES.get(mission.profile, 0.0),
    )


def _ensure_capture(db: Session, member: User) -> None:
    _, created = simulate_capture(db, member)
    if not created:
        return
    db.commit()
    try:
        compute_and_persist_readiness(
            db, member, profile_for_user(db, member), datetime.now(UTC)
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Readiness recompute failed for a crew capture")


@router.get("/crew", response_model=list[SurgeonCrewSummaryRead])
def list_crew(
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> list[SurgeonCrewSummaryRead]:
    del surgeon
    members = _crew_members(db)
    for member in members:
        _ensure_capture(db, member)
        ensure_ai_followup(db, member)
    return [_summary(db, member) for member in members]


@router.get("/crew/{crew_user_id}", response_model=SurgeonCrewDetailRead)
def read_crew_detail(
    crew_user_id: int,
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> SurgeonCrewDetailRead:
    del surgeon
    member = _crew_member(db, crew_user_id)
    _ensure_capture(db, member)
    ensure_ai_followup(db, member)
    prediction = predict_crew_risk(db, member)

    snapshot = _latest_snapshot(db, member.id)
    alerts = list(
        db.scalars(
            select(Alert)
            .where(Alert.user_id == member.id)
            .order_by(Alert.created_at.desc())
            .limit(30)
        ).all()
    )
    alerts.sort(
        key=lambda alert: (
            SEVERITY_ORDER.get(alert.severity, 0),
            alert.created_at,
        ),
        reverse=True,
    )
    training_items = training_items_map(db)
    checkins = list(
        db.scalars(
            select(Checkin)
            .options(selectinload(Checkin.entries), selectinload(Checkin.symptoms))
            .where(Checkin.user_id == member.id)
            .order_by(Checkin.started_at.desc())
            .limit(10)
        ).all()
    )
    measurements = list(
        db.scalars(
            select(Measurement)
            .where(Measurement.user_id == member.id)
            .order_by(Measurement.measured_at.desc())
            .limit(80)
        ).all()
    )
    assessments = list(
        db.scalars(
            select(SurgeonAssessment)
            .where(SurgeonAssessment.crew_user_id == member.id)
            .order_by(SurgeonAssessment.created_at.desc())
            .limit(10)
        ).all()
    )
    instructions = list(
        db.scalars(
            select(SurgeonInstruction)
            .where(SurgeonInstruction.crew_user_id == member.id)
            .order_by(SurgeonInstruction.created_at.desc())
            .limit(20)
        ).all()
    )
    history = list(
        db.scalars(
            select(ReadinessSnapshot)
            .where(ReadinessSnapshot.user_id == member.id)
            .order_by(ReadinessSnapshot.computed_at.desc())
            .limit(14)
        ).all()
    )
    feed = build_capture_feed(db, member)

    return SurgeonCrewDetailRead(
        member=_summary(db, member, prediction),
        mission=_mission_for_member(db, member),
        readiness=ReadinessSnapshotRead.model_validate(snapshot) if snapshot else None,
        prediction=prediction,
        readiness_history=[
            ReadinessSnapshotRead.model_validate(item) for item in history
        ],
        alerts=[alert_read(alert, training_items) for alert in alerts],
        latest_capture=CaptureFeedRead.model_validate(feed),
        measurements=[
            MeasurementRead.model_validate(measurement) for measurement in measurements
        ],
        checkins=[CheckinRead.model_validate(checkin) for checkin in checkins],
        assessments=[assessment_read(item) for item in assessments],
        instructions=[instruction_read(item) for item in instructions],
    )


@router.get(
    "/crew/{crew_user_id}/metrics/{code}/series",
    response_model=MetricSeriesRead,
)
def read_crew_metric_series(
    crew_user_id: int,
    code: str,
    days: int = Query(default=30, ge=7, le=90),
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> MetricSeriesRead:
    del surgeon
    member = _crew_member(db, crew_user_id)
    if days not in TELEMETRY_RANGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="days must be 7, 30, or 90",
        )
    metric = db.get(MetricDefinition, code)
    if metric is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unknown metric code"
        )
    return build_metric_series(db, member, metric, days)


@router.post("/crew/{crew_user_id}/captures/simulate", response_model=CaptureFeedRead)
def simulate_crew_capture(
    crew_user_id: int,
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> CaptureFeedRead:
    del surgeon
    member = _crew_member(db, crew_user_id)
    simulate_capture(db, member, force=True)
    db.commit()
    try:
        compute_and_persist_readiness(
            db, member, profile_for_user(db, member), datetime.now(UTC)
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Readiness recompute failed for a surgeon capture")
    return CaptureFeedRead.model_validate(
        build_capture_feed(db, member, captured=True)
    )


@router.post(
    "/crew/{crew_user_id}/assessments",
    response_model=SurgeonAssessmentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_assessment(
    crew_user_id: int,
    payload: SurgeonAssessmentCreate,
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> SurgeonAssessmentRead:
    member = _crew_member(db, crew_user_id)
    assessment = SurgeonAssessment(
        surgeon_id=surgeon.id,
        crew_user_id=member.id,
        status="final",
        working_diagnosis=payload.working_diagnosis,
        findings=payload.findings,
        plan=payload.plan,
        follow_up=payload.follow_up,
        share_with_crew=payload.share_with_crew,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment_read(assessment)


@router.post(
    "/crew/{crew_user_id}/instructions",
    response_model=SurgeonInstructionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_instruction(
    crew_user_id: int,
    payload: SurgeonInstructionCreate,
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> SurgeonInstructionRead:
    member = _crew_member(db, crew_user_id)
    instruction = SurgeonInstruction(
        surgeon_id=surgeon.id,
        crew_user_id=member.id,
        kind=payload.kind,
        message=payload.message,
        status="open",
    )
    db.add(instruction)
    db.commit()
    db.refresh(instruction)
    return instruction_read(instruction)


@router.post(
    "/crew/{crew_user_id}/alerts/{alert_id}/ack",
    response_model=AlertRead,
)
def acknowledge_crew_alert(
    crew_user_id: int,
    alert_id: int,
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> AlertRead:
    del surgeon
    member = _crew_member(db, crew_user_id)
    alert = db.scalar(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == member.id)
    )
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.now(UTC)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert_read(alert, training_items_map(db))


@router.get("/crew/{crew_user_id}/prediction", response_model=PredictionRead)
def read_crew_prediction(
    crew_user_id: int,
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> PredictionRead:
    del surgeon
    member = _crew_member(db, crew_user_id)
    _ensure_capture(db, member)
    ensure_ai_followup(db, member)
    return predict_crew_risk(db, member)


@router.post("/crew/{crew_user_id}/assistant", response_model=AssistantAnswerRead)
def ask_surgeon_assistant(
    crew_user_id: int,
    payload: AssistantQuestion,
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> AssistantAnswerRead:
    del surgeon
    member = _crew_member(db, crew_user_id)
    _ensure_capture(db, member)
    ensure_ai_followup(db, member)
    return answer_surgeon_question(db, member, payload.question)


@router.get("/crew/{crew_user_id}/updates", response_model=SurgeonUpdatesRead)
def read_crew_updates(
    crew_user_id: int,
    surgeon: User = Depends(get_current_surgeon),
    db: Session = Depends(get_db),
) -> SurgeonUpdatesRead:
    del surgeon
    member = _crew_member(db, crew_user_id)
    return crew_updates(db, member.id)
