from datetime import timedelta

from sqlalchemy import select

from app.models import Alert, Checkin, Measurement, MetricDefinition, Symptom
from app.services.readiness import (
    compute_and_persist_readiness,
    compute_readiness,
    status_for_score,
)
from tests.helpers import (
    REFERENCE,
    add_nominal_baseline,
    add_previous_days,
    add_series,
)


def test_status_boundaries() -> None:
    assert status_for_score(100) == "nominal"
    assert status_for_score(85) == "nominal"
    assert status_for_score(84.9) == "watch"
    assert status_for_score(70) == "watch"
    assert status_for_score(69.9) == "caution"
    assert status_for_score(50) == "caution"
    assert status_for_score(49.9) == "critical"


def test_baseline_and_zscore(db_session, metric_definitions, test_user) -> None:
    add_series(db_session, test_user, "heart_rate", 60, 80)

    result = compute_readiness(db_session, test_user, "mars_transit", REFERENCE)

    assert result is not None
    factor = next(item for item in result.factors if item["metric"] == "heart_rate")
    assert factor["z"] == 5.0
    assert result.domain_scores == {"cardiovascular": 10.0}
    assert result.score == 10.0
    assert result.status == "critical"


def test_sparse_nominal_data_is_not_reported(db_session, metric_definitions, test_user) -> None:
    add_series(db_session, test_user, "heart_rate", 60, 60)
    add_series(db_session, test_user, "hrv_rmssd", 50, 50)

    result = compute_readiness(db_session, test_user, "mars_transit", REFERENCE)

    assert result is None


def test_missing_domains_are_excluded(db_session, metric_definitions, test_user) -> None:
    add_series(db_session, test_user, "heart_rate", 60, 60)
    add_series(db_session, test_user, "hrv_rmssd", 50, 50)
    add_series(db_session, test_user, "sleep_duration_h", 8, 8)
    add_series(db_session, test_user, "exercise_load_min", 30, 30)

    result = compute_readiness(db_session, test_user, "mars_transit", REFERENCE)

    assert result is not None
    assert set(result.domain_scores) == {"cardiovascular", "sleep", "musculoskeletal"}
    assert result.score == 100.0
    assert result.status == "nominal"


def test_first_checkin_red_flag_returns_rule_only_result(
    db_session, metric_definitions, test_user
) -> None:
    for code, value in (("body_temp_c", 38.5), ("heart_rate", 120)):
        metric = db_session.get(MetricDefinition, code)
        db_session.add(
            Measurement(
                user_id=test_user.id,
                metric_code=code,
                value=value,
                unit=metric.unit,
                measured_at=REFERENCE,
                source="manual",
            )
        )
    checkin = Checkin(
        user_id=test_user.id,
        started_at=REFERENCE - timedelta(minutes=5),
        completed_at=REFERENCE,
        status="completed",
    )
    checkin.symptoms.append(Symptom(region="chest", symptom="chest pain", severity=7))
    db_session.add(checkin)
    db_session.flush()

    result = compute_readiness(db_session, test_user, "mars_transit", REFERENCE)

    assert result is not None
    assert result.has_score is False
    assert "R1" in result.fired_rules
    assert "R7" in result.fired_rules
    assert result.status == "critical"


def test_r1_fires_and_overrides_a_high_composite(db_session, metric_definitions, test_user) -> None:
    add_nominal_baseline(db_session, test_user)

    for code, value in (("body_temp_c", 38.4), ("heart_rate", 104)):
        metric = db_session.get(MetricDefinition, code)
        db_session.add(
            Measurement(
                user_id=test_user.id,
                metric_code=code,
                value=value,
                unit=metric.unit,
                measured_at=REFERENCE + timedelta(minutes=1),
                source="manual",
            )
        )
    db_session.flush()

    result = compute_readiness(
        db_session, test_user, "mars_transit", REFERENCE + timedelta(minutes=2)
    )

    assert result is not None
    assert result.score >= 85
    assert "R1" in result.fired_rules
    assert result.status == "critical"


def test_r4_sleep_debt(db_session, metric_definitions, test_user) -> None:
    add_series(db_session, test_user, "sleep_duration_h", 8.0, 3.5)
    add_previous_days(db_session, test_user, "sleep_duration_h", [3.5, 3.5])

    result = compute_readiness(
        db_session, test_user, "mars_transit", REFERENCE + timedelta(minutes=2)
    )

    assert result is not None
    assert "R4" in result.fired_rules


def test_r5_mood_and_social(db_session, metric_definitions, test_user) -> None:
    add_series(db_session, test_user, "mood_score", 4.0, 1.8)
    add_previous_days(db_session, test_user, "mood_score", [1.8, 1.8, 1.8, 1.8])
    add_series(db_session, test_user, "social_interaction_score", 4.0, 2.0)

    result = compute_readiness(
        db_session, test_user, "mars_transit", REFERENCE + timedelta(minutes=2)
    )

    assert result is not None
    assert "R5" in result.fired_rules


def test_r6_orthostatic(db_session, metric_definitions, test_user) -> None:
    add_series(db_session, test_user, "orthostatic_hr_rise", 9, 35)

    result = compute_readiness(db_session, test_user, "mars_transit", REFERENCE)

    assert result is not None
    assert "R6" in result.fired_rules


def test_r7_red_flag_symptom(db_session, metric_definitions, test_user) -> None:
    add_series(db_session, test_user, "vision_change_score", 0, 0)

    checkin = Checkin(
        user_id=test_user.id,
        started_at=REFERENCE - timedelta(hours=1),
        completed_at=REFERENCE,
        status="completed",
    )
    checkin.symptoms.append(Symptom(region="chest", symptom="chest pain", severity=5))
    db_session.add(checkin)
    db_session.flush()

    result = compute_readiness(
        db_session, test_user, "mars_transit", REFERENCE + timedelta(minutes=2)
    )

    assert result is not None
    assert "R7" in result.fired_rules


def test_determinism(db_session, metric_definitions, test_user) -> None:
    add_nominal_baseline(db_session, test_user)

    first = compute_readiness(db_session, test_user, "mars_transit", REFERENCE)
    second = compute_readiness(db_session, test_user, "mars_transit", REFERENCE)

    assert first is not None
    assert second is not None
    assert first.score == second.score
    assert first.status == second.status
    assert first.domain_scores == second.domain_scores
    assert first.factors == second.factors
    assert first.fired_rules == second.fired_rules


def test_alert_dedup_ack_and_resolve(db_session, metric_definitions, test_user) -> None:
    add_series(db_session, test_user, "hrv_rmssd", 55, 35)

    first = compute_and_persist_readiness(
        db_session, test_user, "mars_transit", REFERENCE + timedelta(minutes=1)
    )
    db_session.commit()
    assert first is not None

    alerts = db_session.scalars(
        select(Alert).where(Alert.user_id == test_user.id, Alert.status == "active")
    ).all()
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert.rule_id == "trend-hrv_rmssd"

    compute_and_persist_readiness(
        db_session, test_user, "mars_transit", REFERENCE + timedelta(minutes=2)
    )
    db_session.commit()
    matching = db_session.scalars(
        select(Alert).where(Alert.user_id == test_user.id, Alert.rule_id == "trend-hrv_rmssd")
    ).all()
    assert len(matching) == 1

    alert.status = "acknowledged"
    db_session.commit()

    compute_and_persist_readiness(
        db_session, test_user, "mars_transit", REFERENCE + timedelta(minutes=3)
    )
    db_session.commit()
    alert = db_session.scalar(
        select(Alert).where(Alert.user_id == test_user.id, Alert.rule_id == "trend-hrv_rmssd")
    )
    assert alert is not None
    assert alert.status == "acknowledged"

    metric = db_session.get(MetricDefinition, "hrv_rmssd")
    db_session.add(
        Measurement(
            user_id=test_user.id,
            metric_code="hrv_rmssd",
            value=55,
            unit=metric.unit,
            measured_at=REFERENCE + timedelta(minutes=4),
            source="manual",
        )
    )
    db_session.flush()

    compute_and_persist_readiness(
        db_session, test_user, "mars_transit", REFERENCE + timedelta(minutes=5)
    )
    db_session.commit()
    alert = db_session.scalar(
        select(Alert).where(Alert.user_id == test_user.id, Alert.rule_id == "trend-hrv_rmssd")
    )
    assert alert is not None
    assert alert.status == "resolved"
