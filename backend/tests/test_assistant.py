from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Alert,
    Measurement,
    MetricDefinition,
    ReadinessSnapshot,
    User,
)


def _seed_context(db: Session, user: User) -> None:
    now = datetime.now(UTC)
    db.add(
        ReadinessSnapshot(
            user_id=user.id,
            computed_at=now - timedelta(minutes=5),
            score=72.0,
            status="watch",
            domain_scores={"sleep": 58.0},
            factors=[
                {
                    "metric": "sleep_efficiency_pct",
                    "label": "Sleep efficiency",
                    "value": 76.0,
                    "unit": "%",
                    "z": -3.0,
                    "contribution": -42.0,
                    "direction": "down",
                }
            ],
            fired_rules=[],
        )
    )
    db.add(
        Alert(
            user_id=user.id,
            severity="caution",
            rule_id="R4",
            title="Sleep is fragmented",
            rationale="Sleep efficiency is below baseline.",
            recommended_action="Protect the sleep window.",
            status="active",
            created_at=now - timedelta(hours=1),
        )
    )
    for code, value in (
        ("hrv_rmssd", 38.8),
        ("sleep_duration_h", 5.4),
        ("sleep_efficiency_pct", 76),
    ):
        definition = db.get(MetricDefinition, code)
        db.add(
            Measurement(
                user_id=user.id,
                metric_code=code,
                value=value,
                unit=definition.unit if definition else "",
                measured_at=now - timedelta(minutes=20),
                source="device",
            )
        )
    db.commit()


def test_assistant_suggestions_and_cited_rule_based_answers(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    db_session: Session,
    metric_definitions: None,
    content_seed: None,
) -> None:
    _seed_context(db_session, test_user)

    suggestions = client.get("/assistant/suggestions", headers=auth_headers)
    assert suggestions.status_code == 200
    questions = [item["question"] for item in suggestions.json()]
    assert "Why is my HRV low?" in questions
    assert "When should I contact the flight surgeon?" in questions

    hrv = client.post(
        "/assistant/ask",
        json={"question": "Why is my HRV low?"},
        headers=auth_headers,
    )
    assert hrv.status_code == 200
    hrv_body = hrv.json()
    assert hrv_body["mode"] == "rule_based"
    assert hrv_body["refused"] is False
    assert "38.8" in hrv_body["answer"]
    assert "hrv-basics" in {citation["slug"] for citation in hrv_body["citations"]}
    assert len(hrv_body["answer"].split()) <= 120

    sleep = client.post(
        "/assistant/ask",
        json={"question": "What should I do about sleep debt?"},
        headers=auth_headers,
    )
    assert sleep.status_code == 200
    assert "sleep-circadian" in {
        citation["slug"] for citation in sleep.json()["citations"]
    }

    readiness = client.post(
        "/assistant/ask",
        json={"question": "Am I ready for EVA?"},
        headers=auth_headers,
    )
    assert readiness.status_code == 200
    assert "72.0" in readiness.json()["answer"]

    red_flag_info = client.post(
        "/assistant/ask",
        json={"question": "When should I contact the flight surgeon?"},
        headers=auth_headers,
    )
    assert red_flag_info.status_code == 200
    assert "chest pain" in red_flag_info.json()["answer"].lower()
    assert "red-flags" in {
        citation["slug"] for citation in red_flag_info.json()["citations"]
    }


def test_assistant_refuses_diagnosis_and_escalates_red_flags(
    client: TestClient,
    auth_headers: dict[str, str],
    content_seed: None,
) -> None:
    diagnosis = client.post(
        "/assistant/ask",
        json={"question": "Diagnose my chest pain and prescribe a dose."},
        headers=auth_headers,
    )
    assert diagnosis.status_code == 200
    body = diagnosis.json()
    assert body["refused"] is True
    assert "can't diagnose" in body["answer"]
    assert "red-flags" in {citation["slug"] for citation in body["citations"]}

    red_flag = client.post(
        "/assistant/ask",
        json={"question": "I have chest pain and shortness of breath."},
        headers=auth_headers,
    )
    assert red_flag.status_code == 200
    red_body = red_flag.json()
    assert red_body["refused"] is False
    assert "flight surgeon" in red_body["answer"].lower()
    assert "red-flags" in {
        citation["slug"] for citation in red_body["citations"]
    }

    medication = client.post(
        "/assistant/ask",
        json={"question": "Can I take ibuprofen for my headache?"},
        headers=auth_headers,
    )
    assert medication.status_code == 200
    medication_body = medication.json()
    assert medication_body["refused"] is True
    assert "medication" in medication_body["answer"].lower()
    assert medication_body["citations"][0]["slug"] == "red-flags"

    bone = client.post(
        "/assistant/ask",
        json={"question": "How do I prevent bone loss on Mars?"},
        headers=auth_headers,
    )
    assert bone.status_code == 200
    # The question-specific article must lead, not an unrelated active alert.
    assert bone.json()["citations"][0]["slug"] == "bone-loading"
