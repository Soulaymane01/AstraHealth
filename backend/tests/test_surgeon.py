from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Alert, Quiz, QuizAttempt, User
from tests.helpers import add_series, create_crew_with_member


def _surgeon(db_session: Session) -> User:
    surgeon = User(
        full_name="Dr. Test",
        role="flight_surgeon",
        crew_id=None,
        share_status="private",
    )
    db_session.add(surgeon)
    db_session.commit()
    db_session.refresh(surgeon)
    return surgeon


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

    response = client.get("/surgeon/crew", headers={"X-Astra-Role": "surgeon"})
    assert response.status_code == 200
    crew = response.json()
    assert {member["id"] for member in crew} == {test_user.id, other.id}

    detail = client.get(f"/surgeon/crew/{test_user.id}", headers={"X-Astra-Role": "surgeon"})
    assert detail.status_code == 200
    body = detail.json()
    assert body["member"]["id"] == test_user.id
    assert body["mission"]["name"] == "Test Mission"
    assert len(body["latest_capture"]["metrics"]) == 13
    assert body["latest_capture"]["simulated"] is True


def test_surgeon_can_read_crew_quiz_results(
    client: TestClient,
    db_session: Session,
    test_user: User,
    auth_headers: dict[str, str],
    content_seed: None,
) -> None:
    surgeon = _surgeon(db_session)
    create_crew_with_member(db_session, test_user)
    quiz = db_session.scalar(select(Quiz).where(Quiz.slug == "know-yourself"))
    assert quiz is not None
    db_session.add(
        QuizAttempt(
            quiz_id=quiz.id,
            user_id=test_user.id,
            answers=[2, 1, 1, 0, 2],
            score=80.0,
            completed_at=datetime.now(UTC),
        )
    )
    phq = db_session.scalar(select(Quiz).where(Quiz.slug == "phq9-depression"))
    assert phq is not None
    db_session.add(
        QuizAttempt(
            quiz_id=phq.id,
            user_id=test_user.id,
            answers=[1, 1, 1, 1, 1, 1, 1, 1, 0],
            score=33.3,
            completed_at=datetime.now(UTC),
        )
    )
    db_session.commit()

    headers = {"X-Astra-Role": "surgeon"}
    response = client.get(f"/surgeon/crew/{test_user.id}/quizzes", headers=headers)
    assert response.status_code == 200
    body = response.json()
    quiz_result = next(item for item in body if item["slug"] == "know-yourself")
    assert quiz_result["attempt_count"] == 1
    assert quiz_result["best_score"] == 80.0
    assert quiz_result["attempts"][0]["score"] == 80.0
    screening = next(item for item in body if item["slug"] == "phq9-depression")
    assert screening["kind"] == "screening"
    assert screening["latest_total_score"] == 8
    assert screening["latest_severity"] == "mild"

    knowledge_detail = client.get(
        f"/surgeon/crew/{test_user.id}/quizzes/know-yourself", headers=headers
    )
    assert knowledge_detail.status_code == 200
    detail_body = knowledge_detail.json()
    assert detail_body["attempts"][0]["score"] == 80.0
    assert len(detail_body["attempts"][0]["questions"]) == 5
    assert detail_body["attempts"][0]["questions"][0]["correct"] is True

    screening_detail = client.get(
        f"/surgeon/crew/{test_user.id}/quizzes/phq9-depression", headers=headers
    )
    assert screening_detail.status_code == 200
    screening_body = screening_detail.json()
    assert screening_body["attempts"][0]["total_score"] == 8
    assert screening_body["attempts"][0]["severity"] == "mild"
    assert screening_body["attempts"][0]["questions"][0]["score_value"] == 1

    forbidden = client.get(
        f"/surgeon/crew/{test_user.id}/quizzes",
        headers=auth_headers,
    )
    assert forbidden.status_code == 403


def test_surgeon_assessment_and_instruction_reach_the_crew(
    client: TestClient,
    db_session: Session,
    test_user: User,
    auth_headers: dict[str, str],
) -> None:
    surgeon = _surgeon(db_session)
    create_crew_with_member(db_session, test_user)
    surgeon_headers = {"X-Astra-Role": "surgeon"}

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


def test_surgeon_assistant_supports_without_diagnosing(
    client: TestClient,
    db_session: Session,
    test_user: User,
    auth_headers: dict[str, str],
    metric_definitions: None,
    content_seed: None,
) -> None:
    surgeon = _surgeon(db_session)
    create_crew_with_member(db_session, test_user)
    headers = {"X-Astra-Role": "surgeon"}

    prediction = client.get(
        f"/surgeon/crew/{test_user.id}/prediction", headers=headers
    )
    assert prediction.status_code == 200
    assert prediction.json()["risk_level"] in {"low", "moderate", "high"}
    assert prediction.json()["disclaimer"]

    risk = client.post(
        f"/surgeon/crew/{test_user.id}/assistant",
        json={"question": "What is the early-warning risk?"},
        headers=headers,
    )
    assert risk.status_code == 200
    risk_body = risk.json()
    assert risk_body["mode"] == "rule_based"
    assert risk_body["refused"] is False
    assert "decision support" in risk_body["answer"].lower()
    assert risk_body["citations"]

    refusal = client.post(
        f"/surgeon/crew/{test_user.id}/assistant",
        json={"question": "Diagnose the fever and prescribe a dose."},
        headers=headers,
    )
    assert refusal.status_code == 200
    refusal_body = refusal.json()
    assert refusal_body["refused"] is True
    assert "can't diagnose" in refusal_body["answer"].lower()
    assert refusal_body["citations"][0]["slug"] == "red-flags"

    forbidden = client.post(
        f"/surgeon/crew/{test_user.id}/assistant",
        json={"question": "What is the risk?"},
        headers=auth_headers,
    )
    assert forbidden.status_code == 403


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
    headers = {"X-Astra-Role": "surgeon"}

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
