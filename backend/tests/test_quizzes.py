from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from tests.helpers import create_crew_with_member

CORRECT_SELF = [2, 1, 2, 1, 2]


def test_quiz_list_and_detail_hide_answers(
    client: TestClient, auth_headers: dict[str, str], content_seed: None
) -> None:
    listing = client.get("/quizzes", headers=auth_headers)
    assert listing.status_code == 200
    quizzes = listing.json()
    assert {quiz["slug"] for quiz in quizzes} == {
        "know-yourself",
        "know-your-crew",
        "phq9-depression",
        "gad7-anxiety",
    }
    self_quiz = next(quiz for quiz in quizzes if quiz["slug"] == "know-yourself")
    assert self_quiz["mode"] == "self"
    assert self_quiz["question_count"] == 5

    detail = client.get("/quizzes/know-yourself", headers=auth_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert len(body["questions"]) == 5
    assert body["eligible_subjects"] == []
    for question in body["questions"]:
        assert "answer_index" not in question
        assert "explanation" not in question

    missing = client.get("/quizzes/not-a-quiz", headers=auth_headers)
    assert missing.status_code == 404


def test_self_quiz_submission_awards_credits_only_on_the_first_attempt(
    client: TestClient, auth_headers: dict[str, str], content_seed: None
) -> None:
    first = client.post(
        "/quizzes/know-yourself/submit",
        json={"answers": CORRECT_SELF},
        headers=auth_headers,
    )
    assert first.status_code == 200
    body = first.json()
    assert body["score"] == 100.0
    assert body["correct_count"] == 5
    assert body["credits_awarded"] == 50
    assert "quiz-ace" in {item["code"] for item in body["new_achievements"]}
    assert all(question["correct"] for question in body["questions"])
    assert body["questions"][0]["explanation"]

    credits = client.get("/credits", headers=auth_headers)
    assert credits.json()["balance"] == 50

    replay = client.post(
        "/quizzes/know-yourself/submit",
        json={"answers": CORRECT_SELF},
        headers=auth_headers,
    )
    assert replay.status_code == 200
    assert replay.json()["credits_awarded"] == 0
    assert replay.json()["new_achievements"] == []

    credits_after = client.get("/credits", headers=auth_headers)
    assert credits_after.json()["balance"] == 50

    listing = client.get("/quizzes", headers=auth_headers).json()
    self_quiz = next(quiz for quiz in listing if quiz["slug"] == "know-yourself")
    assert self_quiz["best_score"] == 100.0
    assert self_quiz["attempt_count"] == 2


def test_crew_quiz_requires_consent(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    db_session: Session,
    content_seed: None,
) -> None:
    other = create_crew_with_member(db_session, test_user, share_status="private")

    detail = client.get("/quizzes/know-your-crew", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["eligible_subjects"] == []

    blocked = client.post(
        "/quizzes/know-your-crew/submit",
        json={"answers": [1, 1, 1, 1, 1], "subject_user_id": other.id},
        headers=auth_headers,
    )
    assert blocked.status_code == 403

    other.share_status = "status_only"
    db_session.commit()

    detail_after = client.get("/quizzes/know-your-crew", headers=auth_headers)
    subjects = detail_after.json()["eligible_subjects"]
    assert [subject["id"] for subject in subjects] == [other.id]

    allowed = client.post(
        "/quizzes/know-your-crew/submit",
        json={"answers": [1, 1, 1, 1, 1], "subject_user_id": other.id},
        headers=auth_headers,
    )
    assert allowed.status_code == 200
    body = allowed.json()
    assert body["score"] == 100.0
    assert body["subject"]["id"] == other.id
    assert body["subject"]["share_status"] == "status_only"


def test_screening_quizzes_report_total_severity_and_self_harm(
    client: TestClient, auth_headers: dict[str, str], content_seed: None
) -> None:
    detail = client.get("/quizzes/phq9-depression", headers=auth_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["kind"] == "screening"
    assert body["instrument"] == "phq9"
    assert body["max_score"] == 27
    assert len(body["questions"]) == 9

    result = client.post(
        "/quizzes/phq9-depression/submit",
        json={"answers": [0, 0, 0, 0, 0, 0, 0, 0, 3]},
        headers=auth_headers,
    )
    assert result.status_code == 200
    payload = result.json()
    assert payload["kind"] == "screening"
    assert payload["total_score"] == 3
    assert payload["max_score"] == 27
    assert payload["severity"] == "minimal"
    assert payload["self_harm_flag"] is True
    assert "contact the flight surgeon now" in payload["severity_advice"].lower()
    assert payload["credits_awarded"] == 0
    assert payload["new_achievements"] == []
    assert payload["correct_count"] == 0
    assert payload["questions"][8]["score_value"] == 3

    anxiety = client.post(
        "/quizzes/gad7-anxiety/submit",
        json={"answers": [2, 2, 2, 2, 2, 2, 2]},
        headers=auth_headers,
    )
    assert anxiety.status_code == 200
    anxiety_body = anxiety.json()
    assert anxiety_body["total_score"] == 14
    assert anxiety_body["severity"] == "moderate"
    assert anxiety_body["severity_label"] == "Moderate"
    assert anxiety_body["credits_awarded"] == 0

    listing = client.get("/quizzes", headers=auth_headers).json()
    phq = next(item for item in listing if item["slug"] == "phq9-depression")
    assert phq["kind"] == "screening"
    assert phq["latest_total_score"] == 3
    assert phq["latest_severity"] == "minimal"
    assert phq["best_score"] is None
