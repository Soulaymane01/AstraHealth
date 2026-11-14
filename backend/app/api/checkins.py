import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import (
    Achievement,
    Alert,
    Checkin,
    CheckinEntry,
    CreditEvent,
    Measurement,
    MetricDefinition,
    ReadinessSnapshot,
    Symptom,
    User,
    UserAchievement,
)
from app.schemas import CheckinCreate, CheckinRead, CheckinReportRead
from app.schemas.readiness import ReadinessFactor
from app.services.gamification import (
    CHECKIN_CREDITS,
    achievement_read,
    credit_totals,
    evaluate_achievements,
    get_streak,
    rank_for_credits,
    streak_read,
    update_streak,
)
from app.services.readiness import (
    DOMAIN_LABELS,
    SEVERITY_ORDER,
    TREND_ALERTS,
    compute_and_persist_readiness,
    profile_for_user,
)
from app.services.training import alert_read, training_items_map

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/checkins", tags=["checkins"])

REPORT_SNAPSHOT_WINDOW = timedelta(seconds=2)

DOMAIN_ACTIONS = {
    "cardiovascular": (
        "Protect hydration and sleep, and repeat the cardiovascular check tomorrow."
    ),
    "musculoskeletal": "Review the loading plan and log the next resistance session.",
    "sleep": "Protect tonight's sleep window and keep the wake time steady.",
    "neurobehavioral": "Reduce non-essential load and schedule a crew contact.",
    "metabolic": "Review fluid and energy intake against the daily target.",
    "immune": "Repeat the temperature and symptom check, and escalate red flags.",
}

DEFAULT_ACTION = (
    "Repeat the Systems Check tomorrow so the readiness engine can build a personal baseline."
)


def _checkin_query():
    return select(Checkin).options(selectinload(Checkin.entries), selectinload(Checkin.symptoms))


def _existing_checkin(db: Session, user_id: int, idempotency_key: str) -> Checkin | None:
    return db.scalar(
        _checkin_query().where(
            Checkin.user_id == user_id,
            Checkin.idempotency_key == idempotency_key,
        )
    )


@router.post("", response_model=CheckinRead, status_code=status.HTTP_201_CREATED)
def create_checkin(
    payload: CheckinCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Checkin:
    if payload.idempotency_key:
        existing = _existing_checkin(db, user.id, payload.idempotency_key)
        if existing is not None:
            return existing

    codes = {entry.metric_code for entry in payload.entries}
    metrics = {
        metric.code: metric
        for metric in db.scalars(
            select(MetricDefinition).where(MetricDefinition.code.in_(codes))
        ).all()
    }
    missing = codes - metrics.keys()
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown metric codes: {', '.join(sorted(missing))}",
        )

    now = datetime.now(UTC)
    started_at = payload.started_at or now
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=UTC)
    else:
        started_at = started_at.astimezone(UTC)
    # A device clock can drift; accept a small skew but never a future reading.
    if started_at > now + timedelta(minutes=5):
        started_at = now

    checkin = Checkin(
        user_id=user.id,
        started_at=started_at,
        completed_at=now,
        status="completed",
        notes=payload.notes,
        idempotency_key=payload.idempotency_key,
        entries=[
            CheckinEntry(metric_code=entry.metric_code, value=entry.value, meta=entry.meta)
            for entry in payload.entries
        ],
        symptoms=[
            Symptom(
                region=symptom.region,
                symptom=symptom.symptom,
                severity=symptom.severity,
                duration=symptom.duration,
            )
            for symptom in payload.symptoms
        ],
    )
    db.add(checkin)

    try:
        # Flush first so the credit event can reference the check-in id.
        db.flush()
        checkin_id = checkin.id

        valid_sources = {
            "manual",
            "device",
            "camera_rppg",
            "derived",
            "iss_capture",
            "lunar_capture",
            "mars_capture",
        }
        for entry in payload.entries:
            source = entry.meta.get("source", "manual")
            if source not in valid_sources:
                source = "manual"
            confidence = entry.meta.get("confidence")
            if (
                not isinstance(confidence, (int, float))
                or confidence < 0
                or confidence > 1
            ):
                confidence = None
            db.add(
                Measurement(
                    user_id=user.id,
                    metric_code=entry.metric_code,
                    value=entry.value,
                    unit=metrics[entry.metric_code].unit,
                    # An offline check-in keeps the time it was actually taken.
                    measured_at=started_at,
                    source=source,
                    confidence=confidence,
                )
            )

        if payload.symptoms and "symptom_score" not in codes:
            symptom_metric = db.get(MetricDefinition, "symptom_score")
            if symptom_metric is not None:
                db.add(
                    Measurement(
                        user_id=user.id,
                        metric_code="symptom_score",
                        value=min(10, sum(symptom.severity for symptom in payload.symptoms)),
                        unit=symptom_metric.unit,
                        measured_at=started_at,
                        source="derived",
                    )
                )

        db.add(
            CreditEvent(
                user_id=user.id,
                amount=CHECKIN_CREDITS,
                reason="Systems Check completed",
                ref_type="checkin",
                ref_id=str(checkin_id),
            )
        )
        update_streak(db, user, "checkin", started_at.date(), now)
        evaluate_achievements(db, user, now)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if payload.idempotency_key:
            existing = _existing_checkin(db, user.id, payload.idempotency_key)
            if existing is not None:
                return existing
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Check-in could not be saved"
        ) from exc
    except Exception:
        db.rollback()
        logger.exception("Systems Check failed and was rolled back")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Check-in could not be completed. Nothing was saved.",
        ) from None

    created = db.scalar(_checkin_query().where(Checkin.id == checkin_id))
    if created is None:  # pragma: no cover - the row was committed above
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Check-in was saved but could not be reloaded.",
        )

    # Readiness is best-effort. A bug in the analytics engine must never discard
    # a health submission that was already committed above.
    try:
        compute_and_persist_readiness(db, user, profile_for_user(db, user), now)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Readiness computation failed for check-in %s", checkin_id)

    return created


@router.get("", response_model=list[CheckinRead])
def list_checkins(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Checkin]:
    statement = (
        _checkin_query()
        .where(Checkin.user_id == user.id)
        .order_by(Checkin.started_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(statement).all())


@router.get("/{checkin_id}", response_model=CheckinRead)
def get_checkin(
    checkin_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Checkin:
    checkin = db.scalar(
        _checkin_query().where(Checkin.id == checkin_id, Checkin.user_id == user.id)
    )
    if checkin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found")
    return checkin


@router.get("/{checkin_id}/report", response_model=CheckinReportRead)
def get_checkin_report(
    checkin_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckinReportRead:
    checkin = db.scalar(
        _checkin_query().where(Checkin.id == checkin_id, Checkin.user_id == user.id)
    )
    if checkin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found")

    reference = checkin.completed_at or checkin.started_at
    snapshot = db.scalar(
        select(ReadinessSnapshot)
        .where(
            ReadinessSnapshot.user_id == user.id,
            ReadinessSnapshot.computed_at >= reference - REPORT_SNAPSHOT_WINDOW,
            ReadinessSnapshot.computed_at <= reference + REPORT_SNAPSHOT_WINDOW,
        )
        .order_by(ReadinessSnapshot.computed_at.desc())
        .limit(1)
    )

    previous = db.scalar(
        select(ReadinessSnapshot)
        .where(
            ReadinessSnapshot.user_id == user.id,
            ReadinessSnapshot.computed_at < (snapshot.computed_at if snapshot else reference),
        )
        .order_by(ReadinessSnapshot.computed_at.desc())
        .limit(1)
    )

    alerts = list(
        db.scalars(
            select(Alert).where(Alert.user_id == user.id, Alert.status == "active")
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
    alert_reads = [alert_read(alert, training_items) for alert in alerts]

    factors = snapshot.factors[:3] if snapshot else []
    domain_scores = snapshot.domain_scores if snapshot else {}
    recommended_action = _recommended_action(alerts, factors, domain_scores)

    credits = db.scalar(
        select(func.coalesce(func.sum(CreditEvent.amount), 0)).where(
            CreditEvent.user_id == user.id,
            CreditEvent.ref_type == "checkin",
            CreditEvent.ref_id == str(checkin.id),
        )
    )

    score_delta = None
    if snapshot is not None and previous is not None:
        score_delta = round(snapshot.score - previous.score, 1)

    lifetime, _, balance = credit_totals(db, user.id)
    streak = get_streak(db, user.id, "checkin")
    new_achievements = db.execute(
        select(UserAchievement, Achievement)
        .join(Achievement, UserAchievement.achievement_code == Achievement.code)
        .where(
            UserAchievement.user_id == user.id,
            UserAchievement.unlocked_at >= reference - REPORT_SNAPSHOT_WINDOW,
            UserAchievement.unlocked_at <= reference + REPORT_SNAPSHOT_WINDOW,
        )
        .order_by(UserAchievement.unlocked_at)
    ).all()

    return CheckinReportRead(
        checkin_id=checkin.id,
        completed_at=checkin.completed_at,
        notes=checkin.notes,
        snapshot_id=snapshot.id if snapshot else None,
        computed_at=snapshot.computed_at if snapshot else None,
        score=snapshot.score if snapshot else None,
        status=snapshot.status if snapshot else None,
        previous_score=previous.score if previous else None,
        previous_status=previous.status if previous else None,
        score_delta=score_delta,
        status_changed=bool(
            snapshot is not None and previous is not None and snapshot.status != previous.status
        ),
        domain_scores=domain_scores,
        top_factors=[ReadinessFactor(**factor) for factor in factors],
        recommended_action=recommended_action,
        credits=int(credits or 0),
        current_balance=balance,
        lifetime_credited=lifetime,
        rank=rank_for_credits(lifetime, balance),
        streak=streak_read(streak) if streak is not None else None,
        new_achievements=[
            achievement_read(achievement, unlock.unlocked_at)
            for unlock, achievement in new_achievements
        ],
        alerts=alert_reads,
        insufficient_data=snapshot is None,
    )


def _recommended_action(
    alerts: list[Alert],
    factors: list[dict],
    domain_scores: dict[str, float],
) -> str:
    if alerts:
        return alerts[0].recommended_action

    if factors:
        template = TREND_ALERTS.get(factors[0].get("metric", ""))
        if template is not None:
            return template["action"]

    if domain_scores:
        lowest = min(domain_scores, key=lambda domain: domain_scores[domain])
        action = DOMAIN_ACTIONS.get(lowest)
        if action is not None:
            return f"{DOMAIN_LABELS.get(lowest, lowest)} is the lowest domain today. {action}"

    return DEFAULT_ACTION
