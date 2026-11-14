from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models import Alert, User
from tests.helpers import add_series, create_crew_with_member


def _surgeon(db_session: Session) -> User:
    surgeon = User(
        email="surgeon@test.example",
        password_hash="not-used",
        full_name="Dr. Test",
        role="flight_surgeon",
        crew_id=None,
        share_status="private",
    )
    db_session.add(surgeon)
    db_session.commit()
    db_session.refresh(surgeon)
    return surgeon


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def test_surgeon_console_is_role_protected_and_lists_the_crew(
    client: TestClient,
    db_session: Session,
    test_user: User,
    auth_headers: dict[str, str],
    metric_definitions: None,
) -> None:
    surgeon = _surgeon(db_session)
    other = create_crew_with_member(db_session, test_user)

    forbidden = client.get("/surgeon/crew", headers=auth_headers)
    assert forbidden.status_code == 403

    response = client.get("/surgeon/crew", headers=_headers(surgeon))
    assert response.status_code == 200
    crew = response.json()
    assert {member["id"] for member in crew} == {test_user.id, other.id}

    detail = client.get(f"/surgeon/crew/{test_user.id}", headers=_headers(surgeon))
    assert detail.status_code == 200
    body = detail.json()
    assert body["member"]["id"] == test_user.id
    assert body["mission"]["name"] == "Test Mission"
    assert len(body["latest_capture"]["metrics"]) == 10
    assert body["latest_capture"]["simulated"] is True


def test_surgeon_assessment_and_instruction_reach_the_crew(
    client: TestClient,
    db_session: Session,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    surgeon = _surgeon(db_session)
    create_crew_with_member(db_session, test_user)
    surgeon_headers = _headers(surgeon)

    assessment = client.post(
        f"/surgeon/crew/{test_user.id}/assessments",
        json={
            "working_diagnosis": "Sleep debt with autonomic strain",
            "findings": "HRV is below baseline and sleep efficiency is reduced.",
            "plan": "Protect the sleep window and repeat the check-in tomorrow.",
            "follow_up": "Review the next capture.",
            "share_with_crew": True,
        },
        headers=surgeon_headers,
    )
    assert assessment.status_code == 201
    assert assessment.json()["surgeon_name"] == "Dr. Test"

    instruction = client.post(
        f"/surgeon/crew/{test_user.id}/instructions",
        json={"kind": "request_checkin", "message": "Please repeat the Systems Check."},
        headers=surgeon_headers,
    )
    assert instruction.status_code == 201
    instruction_id = instruction.json()["id"]

    updates = client.get("/me/surgeon-updates", headers=auth_headers)
    assert updates.status_code == 200
    body = updates.json()
    assert body["open_instructions"] == 1
    assert body["assessments"][0]["working_diagnosis"] == "Sleep debt with autonomic strain"
    assert body["instructions"][0]["kind"] == "request_checkin"

    ack = client.post(
        f"/me/surgeon-updates/{instruction_id}/ack", headers=auth_headers
    )
    assert ack.status_code == 200
    assert ack.json()["status"] == "completed"

    detail = client.get(f"/surgeon/crew/{test_user.id}", headers=surgeon_headers)
    assert detail.json()["instructions"][0]["status"] == "completed"


def test_surgeon_can_read_trends_acknowledge_alerts_and_capture(
    client: TestClient,
    db_session: Session,
    test_user: User,
    metric_definitions: None,
) -> None:
    surgeon = _surgeon(db_session)
    create_crew_with_member(db_session, test_user)
    now = datetime.now(UTC)
    add_series(db_session, test_user, "heart_rate", 66.0, 70.0, now - timedelta(hours=2))
    alert = Alert(
        user_id=test_user.id,
        severity="caution",
        rule_id="trend-hrv",
        title="HRV below baseline",
        rationale="Test rationale.",
        recommended_action="Protect sleep and repeat the measurement.",
        status="active",
        created_at=now,
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)
    headers = _headers(surgeon)

    series = client.get(
        f"/surgeon/crew/{test_user.id}/metrics/heart_rate/series",
        params={"days": 7},
        headers=headers,
    )
    assert series.status_code == 200
    assert series.json()["metric"]["code"] == "heart_rate"
    assert series.json()["points"]

    ack = client.post(
        f"/surgeon/crew/{test_user.id}/alerts/{alert.id}/ack", headers=headers
    )
    assert ack.status_code == 200
    assert ack.json()["status"] == "acknowledged"

    capture = client.post(
        f"/surgeon/crew/{test_user.id}/captures/simulate", headers=headers
    )
    assert capture.status_code == 200
    assert capture.json()["captured"] is True
    assert capture.json()["source"] == "mars_capture"
