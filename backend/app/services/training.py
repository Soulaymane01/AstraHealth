from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Alert,
    Checkin,
    Measurement,
    TrainingItem,
    TrainingSession,
    User,
)
from app.schemas.alert import AlertRead
from app.schemas.training import (
    TrainingItemRead,
    TrainingItemSummaryRead,
    TrainingPlanItemRead,
    TrainingPlanRead,
    TrainingReminderRead,
    TrainingRosterItemRead,
    TrainingRosterRead,
    TrainingSessionRead,
)
from app.services.gamification import get_streak, streak_read
from app.services.knowledge import slug_for_rule
from app.services.readiness import profile_for_user

DEFAULT_PROFILE = "mars_transit"
PROFILES = ("mars_transit", "lunar_surface", "station")

TRAINING_KINDS: dict[str, str] = {
    "resistance-baseline": "training",
    "aerobic-interval": "training",
    "bone-load": "training",
    "mobility": "training",
    "sleep-hygiene": "countermeasure",
    "hydration-check": "countermeasure",
    "recovery-check": "countermeasure",
    "nutrition-check": "countermeasure",
}

TRAINING_PROFILES: dict[str, list[str]] = {
    code: list(PROFILES) for code in TRAINING_KINDS
}

PROFILE_TARGETS: dict[str, dict[str, int]] = {
    "mars_transit": {
        "resistance-baseline": 3,
        "aerobic-interval": 2,
        "bone-load": 1,
        "mobility": 3,
    },
    "lunar_surface": {
        "resistance-baseline": 3,
        "aerobic-interval": 1,
        "bone-load": 3,
        "mobility": 3,
    },
    "station": {
        "resistance-baseline": 3,
        "aerobic-interval": 3,
        "bone-load": 1,
        "mobility": 3,
    },
}

PROFILE_PRIORITY: dict[str, list[str]] = {
    "mars_transit": [
        "sleep-hygiene",
        "aerobic-interval",
        "resistance-baseline",
        "mobility",
        "hydration-check",
        "nutrition-check",
        "bone-load",
        "recovery-check",
    ],
    "lunar_surface": [
        "bone-load",
        "resistance-baseline",
        "mobility",
        "sleep-hygiene",
        "hydration-check",
        "nutrition-check",
        "aerobic-interval",
        "recovery-check",
    ],
    "station": [
        "resistance-baseline",
        "aerobic-interval",
        "mobility",
        "sleep-hygiene",
        "hydration-check",
        "nutrition-check",
        "bone-load",
        "recovery-check",
    ],
}

PROFILE_NOTES = {
    "mars_transit": "14-minute comms delay. Complete the check-in before the next window.",
    "lunar_surface": "Surface operations. Bone loading is prioritized this week.",
    "station": "Live link available. Keep the routine anchored to the wake time.",
}

COUNTERMEASURES: dict[str, str] = {
    "R1": "recovery-check",
    "R2": "hydration-check",
    "R3": "hydration-check",
    "R4": "sleep-hygiene",
    "R5": "mobility",
    "R6": "hydration-check",
    "R7": "recovery-check",
}

TREND_COUNTERMEASURES: dict[str, str] = {
    "hrv_rmssd": "sleep-hygiene",
    "hydration_l": "hydration-check",
    "sleep_efficiency_pct": "sleep-hygiene",
    "sleep_latency_min": "sleep-hygiene",
    "stress_score": "mobility",
    "reaction_time_ms": "sleep-hygiene",
    "exercise_load_min": "resistance-baseline",
    "bone_load_min": "bone-load",
    "strength_check": "resistance-baseline",
    "body_mass": "nutrition-check",
    "caloric_intake": "nutrition-check",
    "vitamin_d": "nutrition-check",
    "spo2": "recovery-check",
}


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def countermeasure_code(rule_id: str) -> str | None:
    if rule_id in COUNTERMEASURES:
        return COUNTERMEASURES[rule_id]
    if rule_id.startswith("trend-"):
        return TREND_COUNTERMEASURES.get(rule_id.removeprefix("trend-"), "recovery-check")
    return None


def training_items_map(db: Session) -> dict[str, TrainingItem]:
    return {
        item.code: item
        for item in db.scalars(select(TrainingItem).order_by(TrainingItem.name)).all()
    }


def countermeasure_summary(
    rule_id: str,
    items: dict[str, TrainingItem],
) -> TrainingItemSummaryRead | None:
    code = countermeasure_code(rule_id)
    item = items.get(code) if code else None
    if item is None:
        return None
    return TrainingItemSummaryRead(
        code=item.code,
        name=item.name,
        duration_min=item.duration_min,
        domain=item.domain,
    )


def alert_read(alert: Alert, items: dict[str, TrainingItem]) -> AlertRead:
    return AlertRead(
        id=alert.id,
        severity=alert.severity,
        rule_id=alert.rule_id,
        title=alert.title,
        rationale=alert.rationale,
        recommended_action=alert.recommended_action,
        status=alert.status,
        created_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at,
        countermeasure=countermeasure_summary(alert.rule_id, items),
        knowledge_slug=slug_for_rule(alert.rule_id),
    )


def session_read(session: TrainingSession, item: TrainingItem) -> TrainingSessionRead:
    return TrainingSessionRead(
        id=session.id,
        item_code=item.code,
        item_name=item.name,
        domain=item.domain,
        duration_min=session.duration_min,
        rpe=session.rpe,
        completed_at=session.completed_at,
    )


def _profile_for_user(db: Session, user: User) -> tuple[str, bool]:
    profile = profile_for_user(db, user)
    if profile not in PROFILES:
        profile = DEFAULT_PROFILE
    return profile, user.crew_id is not None


def _week_bounds(reference: datetime) -> tuple[datetime, datetime]:
    start_date = reference.date() - timedelta(days=reference.weekday())
    start = datetime.combine(start_date, time.min, tzinfo=UTC)
    return start, start + timedelta(days=7)


def _items_for_profile(
    db: Session,
    profile: str,
) -> list[TrainingItem]:
    return [
        item
        for item in db.scalars(select(TrainingItem).order_by(TrainingItem.name)).all()
        if profile in TRAINING_PROFILES.get(item.code, [])
    ]


def catalog(db: Session, user: User, profile: str | None = None) -> list[TrainingItemRead]:
    resolved_profile, _ = _profile_for_user(db, user)
    selected = profile if profile in PROFILES else resolved_profile
    return [
        TrainingItemRead(
            code=item.code,
            name=item.name,
            description=item.description,
            domain=item.domain,
            target_per_week=PROFILE_TARGETS.get(selected, {}).get(
                item.code, item.target_per_week
            ),
            duration_min=item.duration_min,
            profiles=TRAINING_PROFILES.get(item.code, []),
            kind=TRAINING_KINDS.get(item.code, "countermeasure"),
        )
        for item in _items_for_profile(db, selected)
    ]


def build_training_plan(
    db: Session,
    user: User,
    reference: datetime | None = None,
) -> TrainingPlanRead:
    reference = _as_utc(reference or datetime.now(UTC))
    profile, profile_assigned = _profile_for_user(db, user)
    week_start, week_end = _week_bounds(reference)

    items = _items_for_profile(db, profile)
    sessions = db.execute(
        select(TrainingSession, TrainingItem)
        .join(TrainingItem, TrainingSession.item_code == TrainingItem.code)
        .where(
            TrainingSession.user_id == user.id,
            TrainingSession.completed_at >= week_start,
            TrainingSession.completed_at < week_end,
        )
        .order_by(TrainingSession.completed_at.desc())
    ).all()
    completed_by_code: dict[str, int] = {}
    for _session, item in sessions:
        completed_by_code[item.code] = completed_by_code.get(item.code, 0) + 1

    active_alerts = list(
        db.scalars(
            select(Alert)
            .where(Alert.user_id == user.id, Alert.status == "active")
            .order_by(Alert.created_at.desc())
        ).all()
    )
    alert_titles_by_code: dict[str, list[str]] = {}
    for alert in active_alerts:
        code = countermeasure_code(alert.rule_id)
        if code is None:
            continue
        titles = alert_titles_by_code.setdefault(code, [])
        if alert.title not in titles:
            titles.append(alert.title)

    priority_order = {
        code: index for index, code in enumerate(PROFILE_PRIORITY[profile])
    }
    plan_items: list[TrainingPlanItemRead] = []
    for item in items:
        kind = TRAINING_KINDS.get(item.code, "countermeasure")
        target = (
            PROFILE_TARGETS.get(profile, {}).get(item.code, item.target_per_week)
            if kind == "training"
            else item.target_per_week
        )
        completed = completed_by_code.get(item.code, 0)
        remaining = max(0, target - completed)
        adherence = round(min(100.0, 100.0 * completed / target), 1) if target else 100.0
        linked = alert_titles_by_code.get(item.code, [])
        priority = 1 if linked else 2 if remaining > 0 else 3
        plan_items.append(
            TrainingPlanItemRead(
                code=item.code,
                name=item.name,
                description=item.description,
                domain=item.domain,
                duration_min=item.duration_min,
                target_per_week=target,
                completed=completed,
                remaining=remaining,
                adherence=adherence,
                kind=kind,
                profiles=TRAINING_PROFILES.get(item.code, []),
                priority=priority,
                countermeasure_for=linked,
            )
        )

    plan_items.sort(
        key=lambda item: (
            item.priority,
            priority_order.get(item.code, 99),
            -item.remaining,
            item.name,
        )
    )
    training_items = [item for item in plan_items if item.kind == "training"]
    countermeasure_items = [item for item in plan_items if item.kind == "countermeasure"]
    training_target = sum(item.target_per_week for item in training_items)
    training_completed = sum(
        min(item.completed, item.target_per_week) for item in training_items
    )
    countermeasure_target = sum(item.target_per_week for item in countermeasure_items)
    countermeasure_completed = sum(
        min(item.completed, item.target_per_week) for item in countermeasure_items
    )
    adherence = (
        round(100.0 * training_completed / training_target, 1) if training_target else 100.0
    )
    next_session = next(
        (item for item in training_items if item.remaining > 0),
        None,
    )
    streak = get_streak(db, user.id, "training")

    recent_rows = db.execute(
        select(TrainingSession, TrainingItem)
        .join(TrainingItem, TrainingSession.item_code == TrainingItem.code)
        .where(TrainingSession.user_id == user.id)
        .order_by(TrainingSession.completed_at.desc())
        .limit(5)
    ).all()

    return TrainingPlanRead(
        profile=profile,
        profile_assigned=profile_assigned,
        week_start=week_start,
        week_end=week_end,
        items=plan_items,
        training_target=training_target,
        training_completed=training_completed,
        adherence=adherence,
        countermeasure_target=countermeasure_target,
        countermeasure_completed=countermeasure_completed,
        next_session=next_session,
        streak=streak_read(streak) if streak is not None else None,
        recent_sessions=[session_read(session, item) for session, item in recent_rows],
        active_countermeasures=len(alert_titles_by_code),
    )


def _day_status(
    done: bool,
    scheduled: datetime,
    now: datetime,
    on_date: date,
) -> str:
    if done:
        return "done"
    if on_date < now.date():
        return "due"
    if on_date > now.date():
        return "upcoming"
    return "due" if now >= scheduled else "upcoming"


def build_roster(
    db: Session,
    user: User,
    on_date: date | None = None,
    now: datetime | None = None,
) -> TrainingRosterRead:
    now = _as_utc(now or datetime.now(UTC))
    on_date = on_date or now.date()
    reference = datetime.combine(on_date, time(hour=12), tzinfo=UTC)
    plan = build_training_plan(db, user, reference=reference)
    profile, profile_assigned = _profile_for_user(db, user)

    day_start = datetime.combine(on_date, time.min, tzinfo=UTC)
    day_end = day_start + timedelta(days=1)
    checkin_done = (
        db.scalar(
            select(Checkin.id)
            .where(
                Checkin.user_id == user.id,
                Checkin.started_at >= day_start,
                Checkin.started_at < day_end,
            )
            .limit(1)
        )
        is not None
    )
    session_codes = set(
        db.scalars(
            select(TrainingSession.item_code).where(
                TrainingSession.user_id == user.id,
                TrainingSession.completed_at >= day_start,
                TrainingSession.completed_at < day_end,
            )
        ).all()
    )
    hydration_measured = (
        db.scalar(
            select(Measurement.id)
            .where(
                Measurement.user_id == user.id,
                Measurement.metric_code == "hydration_l",
                Measurement.measured_at >= day_start,
                Measurement.measured_at < day_end,
            )
            .limit(1)
        )
        is not None
    )
    hydration_done = hydration_measured or "hydration-check" in session_codes
    sleep_done = "sleep-hygiene" in session_codes

    training_due = [
        item for item in plan.items if item.kind == "training" and item.remaining > 0
    ]
    primary_training = (
        training_due[0]
        if training_due
        else next((item for item in plan.items if item.kind == "training"), None)
    )

    def scheduled(hour: int, minute: int) -> datetime:
        return datetime.combine(on_date, time(hour=hour, minute=minute), tzinfo=UTC)

    items: list[TrainingRosterItemRead] = []
    checkin_at = scheduled(7, 0)
    items.append(
        TrainingRosterItemRead(
            time="07:00",
            kind="checkin",
            title="Systems Check",
            detail=PROFILE_NOTES.get(profile, "Complete the daily check-in."),
            status=_day_status(checkin_done, checkin_at, now, on_date),
            training_code=None,
        )
    )

    hydration_at = scheduled(8, 0)
    items.append(
        TrainingRosterItemRead(
            time="08:00",
            kind="hydration",
            title="Hydration check",
            detail="Two-minute fluid review against the daily target.",
            status=_day_status(hydration_done, hydration_at, now, on_date),
            training_code="hydration-check",
        )
    )

    training_at = scheduled(10, 0)
    if primary_training is not None:
        reason = (
            f" · For: {', '.join(primary_training.countermeasure_for)}"
            if primary_training.countermeasure_for
            else ""
        )
        training_detail = (
            f"{primary_training.duration_min} min · {primary_training.name}{reason}"
        )
        training_done = primary_training.code in session_codes
        training_code = primary_training.code
        training_title = primary_training.name
    else:
        training_detail = "The weekly training plan is complete."
        training_done = True
        training_code = None
        training_title = "Training plan complete"
    items.append(
        TrainingRosterItemRead(
            time="10:00",
            kind="training",
            title=training_title,
            detail=training_detail,
            status=_day_status(training_done, training_at, now, on_date),
            training_code=training_code,
            alert_titles=(
                primary_training.countermeasure_for if primary_training is not None else []
            ),
        )
    )

    sleep_at = scheduled(21, 30)
    items.append(
        TrainingRosterItemRead(
            time="21:30",
            kind="sleep",
            title="Sleep wind-down",
            detail="Dim lights, cool the cabin, and protect the sleep window.",
            status=_day_status(sleep_done, sleep_at, now, on_date),
            training_code="sleep-hygiene",
        )
    )

    next_due = next(
        (item for item in items if item.status in ("due", "upcoming")),
        None,
    )
    return TrainingRosterRead(
        date=on_date,
        profile=profile,
        profile_assigned=profile_assigned,
        items=items,
        next_due=next_due,
        completed=sum(1 for item in items if item.status == "done"),
        total=len(items),
    )


def build_reminders(
    db: Session,
    user: User,
    now: datetime | None = None,
) -> TrainingReminderRead:
    now = _as_utc(now or datetime.now(UTC))
    roster = build_roster(db, user, on_date=now.date(), now=now)
    due_count = sum(1 for item in roster.items if item.status == "due")
    return TrainingReminderRead(due_count=due_count, next_due=roster.next_due)
