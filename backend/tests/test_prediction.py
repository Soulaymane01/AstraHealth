from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Alert, Measurement, MetricDefinition, User
from app.services.prediction import predict_crew_risk


def _add_daily(
    db: Session,
    user: User,
    code: str,
    start: float,
    step: float,
    days: int = 10,
) -> None:
    metric = db.get(MetricDefinition, code)
    assert metric is not None
    now = datetime.now(UTC)
    for offset in range(days):
        db.add(
            Measurement(
                user_id=user.id,
                metric_code=code,
                value=round(start + step * (days - 1 - offset), 2),
                unit=metric.unit,
                measured_at=now - timedelta(days=offset, hours=2),
                source="mars_capture",
                notes="Simulated Mars transit sensors capture.",
            )
        )
    db.flush()


def test_prediction_is_low_with_stable_data(
    db_session: Session, test_user: User, metric_definitions: None
) -> None:
    _add_daily(db_session, test_user, "heart_rate", 70, 0)
    _add_daily(db_session, test_user, "body_temp_c", 36.7, 0)
    _add_daily(db_session, test_user, "spo2", 98, 0)
    db_session.commit()

    prediction = predict_crew_risk(db_session, test_user)

    assert prediction.risk_level == "low"
    assert prediction.red_flags == []
    assert prediction.horizon_hours == 168


def test_prediction_flags_fever_and_tachycardia(
    db_session: Session, test_user: User, metric_definitions: None
) -> None:
    _add_daily(db_session, test_user, "heart_rate", 82, 2.5)
    _add_daily(db_session, test_user, "body_temp_c", 36.8, 0.2)
    db_session.add(
        Alert(
            user_id=test_user.id,
            severity="critical",
            rule_id="R1",
            title="Febrile episode with tachycardia",
            rationale="Core temperature at or above 38 °C with a heart rate above 100.",
            recommended_action="Stop activity and contact the flight surgeon.",
            status="active",
            created_at=datetime.now(UTC),
        )
    )
    db_session.commit()

    prediction = predict_crew_risk(db_session, test_user)

    assert prediction.risk_level == "high"
    assert prediction.risk_score >= 65
    assert prediction.red_flags
    assert any("Fever" in flag for flag in prediction.red_flags)
    assert prediction.drivers


def test_prediction_is_honest_when_data_is_missing(
    db_session: Session, test_user: User
) -> None:
    prediction = predict_crew_risk(db_session, test_user)

    assert prediction.risk_level == "low"
    assert prediction.confidence == "low"
    assert prediction.data_coverage == 0
    assert prediction.drivers == []
    assert "No adverse" in prediction.summary
