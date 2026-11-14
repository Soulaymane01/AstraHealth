from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Checkin,
    CreditEvent,
    Measurement,
    Streak,
    User,
    UserAchievement,
)
from app.services.readiness import compute_and_persist_readiness, profile_for_user
from tests.helpers import add_series


def test_checkin_is_idempotent_and_derives_symptom_score(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    payload = {
        "entries": [
            {"metric_code": "heart_rate", "value": 72},
            {"metric_code": "sleep_duration_h", "value": 5.5},
        ],
        "symptoms": [{"region": "head", "symptom": "headache", "severity": 2}],
        "idempotency_key": "test-checkin-1",
    }

    first = client.post("/checkins", json=payload, headers=auth_headers)
    assert first.status_code == 201
    checkin = first.json()
    assert len(checkin["entries"]) == 2
    assert len(checkin["symptoms"]) == 1
    assert checkin["status"] == "completed"

    second = client.post("/checkins", json=payload, headers=auth_headers)
    assert second.status_code == 201
    assert second.json()["id"] == checkin["id"]

    listing = client.get("/checkins", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    detail = client.get(f"/checkins/{checkin['id']}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == checkin["id"]

    symptom_measurements = client.get(
        "/measurements", params={"metric": "symptom_score"}, headers=auth_headers
    )
    assert symptom_measurements.status_code == 200
    assert symptom_measurements.json()[0]["value"] == 2


def test_checkin_rejects_unknown_metric(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    response = client.post(
        "/checkins",
        json={"entries": [{"metric_code": "nope", "value": 1}]},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_checkin_detail_is_scoped_to_the_user(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    created = client.post(
        "/checkins",
        json={"entries": [{"metric_code": "heart_rate", "value": 70}]},
        headers=auth_headers,
    )
    assert created.status_code == 201

    other = client.post(
        "/auth/register",
        json={
            "email": "other@example.com",
            "password": "strong-password",
            "full_name": "Other",
        },
    )
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    response = client.get(f"/checkins/{created.json()['id']}", headers=other_headers)
    assert response.status_code == 404
    report = client.get(f"/checkins/{created.json()['id']}/report", headers=other_headers)
    assert report.status_code == 404


def test_checkin_report_matches_snapshot_and_awards_credits_once(
    client: TestClient,
    db_session: Session,
    auth_headers: dict[str, str],
    test_user: User,
    metric_definitions: None,
    content_seed: None,
) -> None:
    reference = datetime.now(UTC) - timedelta(hours=6)
    add_series(db_session, test_user, "heart_rate", 66.0, 66.0, reference)
    add_series(db_session, test_user, "sleep_duration_h", 7.2, 7.0, reference)
    # Three domains are required for a comparable composite score.
    add_series(db_session, test_user, "exercise_load_min", 30.0, 30.0, reference)
    compute_and_persist_readiness(
        db_session, test_user, profile_for_user(db_session, test_user), reference
    )
    db_session.commit()

    payload = {
        "entries": [
            {"metric_code": "heart_rate", "value": 72},
            {"metric_code": "sleep_duration_h", "value": 5.4},
            {"metric_code": "mood_score", "value": 3},
        ],
        "symptoms": [{"region": "head", "symptom": "headache", "severity": 2}],
        "notes": "Skipped: Training & Nutrition.",
        "idempotency_key": "report-ready-checkin",
    }

    created = client.post("/checkins", json=payload, headers=auth_headers)
    assert created.status_code == 201
    checkin_id = created.json()["id"]

    report = client.get(f"/checkins/{checkin_id}/report", headers=auth_headers)
    assert report.status_code == 200
    data = report.json()
    assert data["checkin_id"] == checkin_id
    assert data["insufficient_data"] is False
    assert data["score"] is not None
    assert data["status"] in {"nominal", "watch", "caution", "critical"}
    assert data["previous_score"] is not None
    assert data["score_delta"] == round(data["score"] - data["previous_score"], 1)
    assert data["snapshot_id"] is not None
    assert len(data["top_factors"]) <= 3
    assert data["recommended_action"]
    assert data["credits"] == 40
    assert data["notes"] == "Skipped: Training & Nutrition."
    assert data["current_balance"] == 40
    assert data["lifetime_credited"] == 40
    assert data["rank"]["rank"] == "Trainee"
    assert 0 < data["rank"]["progress"] < 1
    assert data["streak"]["current"] == 1
    assert data["streak"]["longest"] == 1
    assert "first-check" in {item["code"] for item in data["new_achievements"]}

    latest = client.get("/readiness", headers=auth_headers)
    assert latest.status_code == 200
    assert latest.json()["id"] == data["snapshot_id"]
    assert latest.json()["score"] == data["score"]

    replay = client.post("/checkins", json=payload, headers=auth_headers)
    assert replay.status_code == 201
    assert replay.json()["id"] == checkin_id

    replay_report = client.get(f"/checkins/{checkin_id}/report", headers=auth_headers)
    assert replay_report.json()["credits"] == 40
    credit_count = db_session.scalar(
        select(func.count(CreditEvent.id)).where(CreditEvent.ref_id == str(checkin_id))
    )
    assert credit_count == 1

    critical = client.post(
        "/checkins",
        json={
            "symptoms": [{"region": "chest", "symptom": "Chest pain", "severity": 8}],
            "idempotency_key": "critical-checkin",
        },
        headers=auth_headers,
    )
    assert critical.status_code == 201
    critical_report = client.get(
        f"/checkins/{critical.json()['id']}/report", headers=auth_headers
    )
    assert critical_report.status_code == 200
    critical_data = critical_report.json()
    assert critical_data["status"] == "critical"
    assert critical_data["status_changed"] is True
    assert critical_data["previous_status"] == data["status"]
    assert critical_data["score_delta"] == round(
        critical_data["score"] - critical_data["previous_score"], 1
    )
    r7_alert = next(
        alert for alert in critical_data["alerts"] if alert["rule_id"] == "R7"
    )
    assert r7_alert["countermeasure"]["code"] == "recovery-check"


def test_checkin_report_handles_insufficient_data(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    created = client.post(
        "/checkins",
        json={
            "entries": [{"metric_code": "heart_rate", "value": 70}],
            "notes": "Skipped: Sleep, Mood & Stress, Symptoms, Training & Nutrition.",
        },
        headers=auth_headers,
    )
    assert created.status_code == 201

    report = client.get(f"/checkins/{created.json()['id']}/report", headers=auth_headers)
    assert report.status_code == 200
    data = report.json()
    assert data["insufficient_data"] is True
    assert data["score"] is None
    assert data["status"] is None
    assert data["previous_score"] is None
    assert data["score_delta"] is None
    assert data["status_changed"] is False
    assert data["top_factors"] == []
    assert data["alerts"] == []
    assert data["credits"] == 40
    assert data["recommended_action"]


def test_checkin_survives_a_readiness_failure(
    client: TestClient,
    db_session: Session,
    auth_headers: dict[str, str],
    metric_definitions: None,
    content_seed: None,
    monkeypatch,
) -> None:
    from app.api import checkins as checkins_module

    original = checkins_module.compute_and_persist_readiness

    def fail(*args, **kwargs):
        raise RuntimeError("readiness engine unavailable")

    monkeypatch.setattr(
        "app.api.checkins.compute_and_persist_readiness",
        fail,
    )

    payload = {
        "entries": [{"metric_code": "heart_rate", "value": 72}],
        "symptoms": [{"region": "head", "symptom": "headache", "severity": 2}],
        "idempotency_key": "survives-checkin",
    }
    response = client.post("/checkins", json=payload, headers=auth_headers)
    assert response.status_code == 201
    checkin_id = response.json()["id"]

    # The submission and its credits survive; only the readiness snapshot is
    # missing, and the report explains that honestly.
    assert db_session.scalar(select(func.count(Checkin.id))) == 1
    assert db_session.scalar(select(func.count(Measurement.id))) == 2
    assert db_session.scalar(select(func.count(CreditEvent.id))) == 1
    assert db_session.scalar(select(func.count(Streak.id))) == 1
    assert db_session.scalar(select(func.count(UserAchievement.id))) >= 1

    report = client.get(f"/checkins/{checkin_id}/report", headers=auth_headers)
    assert report.status_code == 200
    assert report.json()["insufficient_data"] is True
    assert report.json()["credits"] == 40

    # Idempotent replay returns the same committed check-in.
    monkeypatch.setattr(
        "app.api.checkins.compute_and_persist_readiness",
        original,
    )
    retry = client.post("/checkins", json=payload, headers=auth_headers)
    assert retry.status_code == 201
    assert retry.json()["id"] == checkin_id
    assert db_session.scalar(select(func.count(Checkin.id))) == 1
    assert db_session.scalar(select(func.count(CreditEvent.id))) == 1


def test_first_checkin_red_flags_create_alerts_without_a_snapshot(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    response = client.post(
        "/checkins",
        json={
            "entries": [
                {"metric_code": "body_temp_c", "value": 38.5},
                {"metric_code": "heart_rate", "value": 120},
            ],
            "symptoms": [
                {"region": "chest", "symptom": "chest pain", "severity": 7, "duration": "10 min"}
            ],
        },
        headers=auth_headers,
    )
    assert response.status_code == 201

    alerts = client.get("/alerts", headers=auth_headers)
    assert alerts.status_code == 200
    assert {alert["rule_id"] for alert in alerts.json()} >= {"R1", "R7"}

    readiness = client.get("/readiness", headers=auth_headers)
    assert readiness.status_code == 404

    report = client.get(f"/checkins/{response.json()['id']}/report", headers=auth_headers)
    assert report.status_code == 200
    body = report.json()
    assert body["insufficient_data"] is True
    assert body["score"] is None
    assert {alert["rule_id"] for alert in body["alerts"]} >= {"R1", "R7"}


def test_offline_checkin_keeps_the_time_it_was_taken(
    client: TestClient,
    db_session: Session,
    auth_headers: dict[str, str],
    test_user: User,
    metric_definitions: None,
) -> None:
    taken_at = datetime.now(UTC) - timedelta(days=2, hours=3)
    response = client.post(
        "/checkins",
        json={
            "entries": [{"metric_code": "heart_rate", "value": 71}],
            "started_at": taken_at.isoformat(),
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["started_at"].startswith(taken_at.date().isoformat())

    measured = client.get(
        "/measurements", params={"metric": "heart_rate"}, headers=auth_headers
    ).json()
    assert measured[-1]["measured_at"].startswith(taken_at.date().isoformat())

    streak = db_session.scalar(
        select(Streak).where(Streak.user_id == test_user.id, Streak.kind == "checkin")
    )
    assert streak is not None
    assert streak.last_date == taken_at.date()


def test_checkin_preserves_automatic_capture_source(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    created = client.post(
        "/checkins",
        json={
            "entries": [
                {
                    "metric_code": "heart_rate",
                    "value": 72,
                    "meta": {"source": "mars_capture", "confidence": 0.93},
                }
            ]
        },
        headers=auth_headers,
    )
    assert created.status_code == 201

    measurements = client.get(
        "/measurements", params={"metric": "heart_rate"}, headers=auth_headers
    )
    latest = measurements.json()[-1]
    assert latest["source"] == "mars_capture"
    assert latest["confidence"] == 0.93


def test_checkin_preserves_camera_source_and_confidence(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    created = client.post(
        "/checkins",
        json={
            "entries": [
                {
                    "metric_code": "heart_rate",
                    "value": 72,
                    "meta": {"source": "camera_rppg", "confidence": 0.82},
                }
            ]
        },
        headers=auth_headers,
    )
    assert created.status_code == 201

    measurements = client.get(
        "/measurements", params={"metric": "heart_rate"}, headers=auth_headers
    )
    assert measurements.status_code == 200
    latest = measurements.json()[-1]
    assert latest["value"] == 72
    assert latest["source"] == "camera_rppg"
    assert latest["confidence"] == 0.82
