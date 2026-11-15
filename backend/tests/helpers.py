from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Crew, Measurement, MetricDefinition, Mission, User

REFERENCE = datetime(2026, 11, 6, 12, 0, tzinfo=UTC)


def nominal_value(metric: MetricDefinition) -> float:
    if metric.normal_min is None or metric.normal_max is None:
        return 0.0
    return (metric.normal_min + metric.normal_max) / 2


def add_series(
    db: Session,
    user: User,
    code: str,
    baseline: float,
    current: float,
    reference: datetime = REFERENCE,
) -> None:
    metric = db.get(MetricDefinition, code)
    assert metric is not None

    for offset in (20, 16, 12, 8, 4):
        db.add(
            Measurement(
                user_id=user.id,
                metric_code=code,
                value=baseline,
                unit=metric.unit,
                measured_at=reference - timedelta(days=offset),
                source="manual",
            )
        )
    db.add(
        Measurement(
            user_id=user.id,
            metric_code=code,
            value=current,
            unit=metric.unit,
            measured_at=reference,
            source="manual",
        )
    )
    db.flush()


def add_previous_days(
    db: Session,
    user: User,
    code: str,
    values: list[float],
    reference: datetime = REFERENCE,
) -> None:
    metric = db.get(MetricDefinition, code)
    assert metric is not None

    for index, value in enumerate(values, start=1):
        db.add(
            Measurement(
                user_id=user.id,
                metric_code=code,
                value=value,
                unit=metric.unit,
                measured_at=reference - timedelta(days=index) + timedelta(minutes=1),
                source="manual",
            )
        )
    db.flush()


def add_nominal_baseline(
    db: Session,
    user: User,
    reference: datetime = REFERENCE,
) -> None:
    metrics = db.query(MetricDefinition).order_by(MetricDefinition.code).all()
    for metric in metrics:
        value = nominal_value(metric)
        add_series(db, user, metric.code, value, value, reference)


def create_crew_with_member(
    db: Session,
    user: User,
    share_status: str = "status_only",
    full_name: str = "Other Crewmate",
    profile: str = "mars_transit",
) -> User:
    mission = Mission(
        name="Test Mission",
        profile=profile,
        environment="spacecraft",
        start_at=datetime.now(UTC) - timedelta(days=10),
        duration_days=900,
    )
    db.add(mission)
    db.flush()
    crew = Crew(name="Test Crew", mission_id=mission.id)
    db.add(crew)
    db.flush()
    user.crew_id = crew.id
    other = User(
        full_name=full_name,
        role="pilot",
        crew_id=crew.id,
        share_status=share_status,
    )
    db.add(other)
    db.commit()
    db.refresh(user)
    db.refresh(other)
    return other
