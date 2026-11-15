from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Measurement, MetricDefinition, User
from app.services.captures import (
    CAPTURE_METRICS,
    build_capture_feed,
    capture_source_for_profile,
    simulate_capture,
)


def test_capture_source_follows_the_mission_environment() -> None:
    assert capture_source_for_profile("mars_transit") == "mars_capture"
    assert capture_source_for_profile("lunar_surface") == "lunar_capture"
    assert capture_source_for_profile("station") == "iss_capture"


def test_capture_feed_simulates_sensor_data_not_manual_inputs(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    response = client.post("/captures/simulate", headers=auth_headers)

    assert response.status_code == 200
    feed = response.json()
    assert feed["captured"] is True
    assert feed["simulated"] is True
    assert feed["source"] == "mars_capture"
    assert feed["source_label"] == "Mars transit sensors"
    assert feed["captured_at"] is not None
    codes = {metric["metric_code"] for metric in feed["metrics"]}
    assert set(CAPTURE_METRICS) == codes
    # Mood, stress, symptoms, nutrition, and strength stay manual.
    assert {
        "mood_score",
        "stress_score",
        "symptom_score",
        "hydration_l",
        "caloric_intake",
        "strength_check",
    }.isdisjoint(codes)
    assert all(metric["value"] is not None for metric in feed["metrics"])


def test_capture_feed_is_idempotent_until_the_interval_passes(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    first = client.post("/captures/simulate", headers=auth_headers).json()
    second = client.get("/captures", headers=auth_headers).json()

    assert second["captured"] is False
    assert second["captured_at"] == first["captured_at"]

    forced = client.post("/captures/simulate", headers=auth_headers).json()
    assert forced["captured"] is True
    assert forced["captured_at"] != first["captured_at"]


def test_capture_service_writes_capture_provenance(
    db_session: Session,
    test_user: User,
    metric_definitions: None,
) -> None:
    measurements, created = simulate_capture(db_session, test_user, force=True)
    db_session.commit()

    assert created is True
    assert len(measurements) == len(CAPTURE_METRICS)
    rows = db_session.scalars(
        select(Measurement).where(Measurement.user_id == test_user.id)
    ).all()
    assert {row.source for row in rows} == {"mars_capture"}
    assert all("Simulated Mars transit sensors" in (row.notes or "") for row in rows)


def test_checkin_capture_values_do_not_displace_the_sensor_feed(
    db_session: Session,
    test_user: User,
    metric_definitions: None,
) -> None:
    simulate_capture(db_session, test_user, force=True)
    db_session.commit()
    captured_at = build_capture_feed(db_session, test_user)["captured_at"]
    heart_rate = db_session.get(MetricDefinition, "heart_rate")

    # A check-in can copy capture values with a capture source and no sensor
    # note. That must not become the "latest capture batch".
    db_session.add(
        Measurement(
            user_id=test_user.id,
            metric_code="heart_rate",
            value=72,
            unit=heart_rate.unit,
            measured_at=datetime.now(UTC) + timedelta(seconds=1),
            source="mars_capture",
            notes=None,
        )
    )
    db_session.commit()

    feed = build_capture_feed(db_session, test_user)

    assert feed["captured_at"] == captured_at
    assert len(feed["metrics"]) == len(CAPTURE_METRICS)
