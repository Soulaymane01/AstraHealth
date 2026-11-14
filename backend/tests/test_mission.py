from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Alert, Checkin, Crew, Mission, SpaceWeatherEvent, User


def _crew_for_user(db_session: Session) -> tuple[User, Crew]:
    user = db_session.query(User).filter(User.email == "test@example.com").one()

    mission = Mission(
        name="Test Mission",
        profile="mars_transit",
        environment="spacecraft",
        start_at=datetime.now(UTC) - timedelta(days=10),
        duration_days=900,
    )
    db_session.add(mission)
    db_session.flush()

    crew = Crew(name="Test Crew", mission_id=mission.id)
    db_session.add(crew)
    db_session.flush()

    user.crew_id = crew.id
    db_session.commit()
    return user, crew


def test_mission_requires_a_crew(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/mission", headers=auth_headers)
    assert response.status_code == 404


def test_mission_returns_elapsed_time(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    _crew_for_user(db_session)

    response = client.get("/mission", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Test Mission"
    assert body["crew_name"] == "Test Crew"
    assert body["crew_count"] == 1
    assert body["comms_delay_min"] == 14.0
    assert body["met_seconds"] >= 9 * 86400


def test_mission_context_returns_latest_event(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    now = datetime.now(UTC)
    db_session.add(
        SpaceWeatherEvent(
            event_id="TEST-GST",
            kind="Geomagnetic Storm",
            start_at=now - timedelta(days=3),
            end_at=now - timedelta(days=2),
            severity="minor",
            summary="Test event.",
            fetched_at=now,
        )
    )
    db_session.commit()

    response = client.get("/mission/context", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["latest_event"]["event_id"] == "TEST-GST"
    assert body["active"] is False


def test_mission_context_active_event(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    now = datetime.now(UTC)
    db_session.add(
        SpaceWeatherEvent(
            event_id="TEST-SPE",
            kind="Solar Energetic Particle",
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=1),
            severity="moderate",
            summary="Active test event.",
            fetched_at=now,
        )
    )
    db_session.commit()

    response = client.get("/mission/context", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["active"] is True


def test_mission_tape_returns_checkins_and_alerts(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    user, _ = _crew_for_user(db_session)
    now = datetime.now(UTC)

    db_session.add(
        Checkin(
            user_id=user.id,
            started_at=now - timedelta(days=1),
            completed_at=now - timedelta(days=1),
            status="completed",
        )
    )
    db_session.add(
        Alert(
            user_id=user.id,
            severity="caution",
            rule_id="trend-test",
            title="Test alert",
            rationale="Test rationale.",
            recommended_action="Test action.",
            status="active",
            created_at=now - timedelta(hours=2),
        )
    )
    db_session.commit()

    response = client.get("/mission/tape", params={"days": 7}, headers=auth_headers)

    assert response.status_code == 200
    events = response.json()
    types = {event["type"] for event in events}
    assert {"checkin", "alert"}.issubset(types)
    assert all(0 <= event["day"] <= 7 for event in events)
