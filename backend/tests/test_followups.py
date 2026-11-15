from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Alert, Measurement, MetricDefinition, SurgeonInstruction, User
from tests.helpers import create_crew_with_member


def _surgeon(db_session: Session) -> User:
    surgeon = User(
        full_name="Dr. Follow-up",
        role="flight_surgeon",
        crew_id=None,
        share_status="private",
    )
    db_session.add(surgeon)
    db_session.commit()
    db_session.refresh(surgeon)
    return surgeon


def test_anomaly_creates_a_deduplicated_ai_focused_check(
    client: TestClient,
    db_session: Session,
    test_user: User,
    auth_headers: dict[str, str],
    metric_definitions: None,
) -> None:
    _surgeon(db_session)
    create_crew_with_member(db_session, test_user)
    now = datetime.now(UTC)
    for code, value in (("body_temp_c", 38.6), ("heart_rate", 106), ("spo2", 94)):
        metric = db_session.get(MetricDefinition, code)
        db_session.add(
            Measurement(
                user_id=test_user.id,
                metric_code=code,
                value=value,
                unit=metric.unit,
                measured_at=now,
                source="mars_capture",
                notes="Simulated Mars transit sensors capture.",
            )
        )
    db_session.add(
        Alert(
            user_id=test_user.id,
            severity="critical",
            rule_id="R1",
            title="Febrile episode with tachycardia",
            rationale="Fever with tachycardia.",
            recommended_action="Escalate to the flight surgeon.",
            status="active",
            created_at=now,
        )
    )
    db_session.commit()

    first = client.get("/me/surgeon-updates", headers=auth_headers)
    assert first.status_code == 200
    instructions = first.json()["instructions"]
    ai = [item for item in instructions if item["source"] == "ai"]
    assert len(ai) == 1
    assert ai[0]["kind"] == "focused_check"
    assert ai[0]["protocol"] == "urgent_recheck"
    assert set(ai[0]["target_metrics"]) >= {"body_temp_c", "heart_rate", "spo2"}
    assert ai[0]["due_at"] is not None
    assert "not a diagnosis" in ai[0]["message"].lower()

    second = client.get("/me/surgeon-updates", headers=auth_headers)
    assert second.status_code == 200
    ai_again = [item for item in second.json()["instructions"] if item["source"] == "ai"]
    assert [item["id"] for item in ai_again] == [ai[0]["id"]]
    count = db_session.scalar(
        select(func.count(SurgeonInstruction.id)).where(
            SurgeonInstruction.crew_user_id == test_user.id,
            SurgeonInstruction.source == "ai",
        )
    )
    assert count == 1


def test_stable_crew_gets_no_ai_followup(
    client: TestClient,
    db_session: Session,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    _surgeon(db_session)
    create_crew_with_member(db_session, test_user)

    response = client.get("/me/surgeon-updates", headers=auth_headers)

    assert response.status_code == 200
    assert [item for item in response.json()["instructions"] if item["source"] == "ai"] == []
