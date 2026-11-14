from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Alert, TrainingSession, User
from tests.helpers import create_crew_with_member


def _alert(
    db: Session,
    user: User,
    rule_id: str,
    title: str,
    severity: str = "caution",
) -> Alert:
    alert = Alert(
        user_id=user.id,
        severity=severity,
        rule_id=rule_id,
        title=title,
        rationale="Test rationale.",
        recommended_action="Test action.",
        status="active",
        created_at=datetime.now(UTC) - timedelta(hours=1),
    )
    db.add(alert)
    db.commit()
    return alert


def test_training_plan_roster_and_countermeasure_priority(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    db_session: Session,
    content_seed: None,
) -> None:
    now = datetime.now(UTC)
    _alert(db_session, test_user, "R4", "Sleep debt is accumulating")
    db_session.add(
        TrainingSession(
            user_id=test_user.id,
            item_code="resistance-baseline",
            completed_at=now - timedelta(minutes=30),
            duration_min=35,
            rpe=6,
        )
    )
    db_session.commit()

    plan_response = client.get("/training/plan", headers=auth_headers)
    assert plan_response.status_code == 200
    plan = plan_response.json()
    assert plan["profile"] == "mars_transit"
    assert plan["profile_assigned"] is False
    assert len(plan["items"]) == 8
    assert plan["training_target"] == 9
    assert plan["training_completed"] == 1
    assert plan["adherence"] == 11.1
    assert plan["recent_sessions"][0]["item_code"] == "resistance-baseline"

    sleep = next(item for item in plan["items"] if item["code"] == "sleep-hygiene")
    assert sleep["priority"] == 1
    assert "Sleep debt is accumulating" in sleep["countermeasure_for"]

    roster_response = client.get("/training/roster", headers=auth_headers)
    assert roster_response.status_code == 200
    roster = roster_response.json()
    assert roster["profile"] == "mars_transit"
    assert roster["profile_assigned"] is False
    assert {item["kind"] for item in roster["items"]} == {
        "checkin",
        "hydration",
        "training",
        "sleep",
    }
    assert roster["next_due"] is not None
    checkin = next(item for item in roster["items"] if item["kind"] == "checkin")
    assert "14-minute comms delay" in checkin["detail"]

    reminders = client.get("/training/reminders", headers=auth_headers)
    assert reminders.status_code == 200
    assert reminders.json()["next_due"] is not None

    catalog = client.get("/training/catalog", headers=auth_headers)
    assert catalog.status_code == 200
    assert len(catalog.json()) == 8
    assert all("mars_transit" in item["profiles"] for item in catalog.json())


def test_training_session_logging_updates_plan_and_credits(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    content_seed: None,
) -> None:
    before = client.get("/training/plan", headers=auth_headers).json()
    resistance_before = next(
        item for item in before["items"] if item["code"] == "resistance-baseline"
    )
    assert resistance_before["completed"] == 0

    logged = client.post(
        "/training/sessions",
        json={
            "item_code": "resistance-baseline",
            "duration_min": 35,
            "rpe": 7,
        },
        headers=auth_headers,
    )
    assert logged.status_code == 201
    assert logged.json()["credits_awarded"] == 30
    assert logged.json()["streak"]["current"] == 1

    after = client.get("/training/plan", headers=auth_headers).json()
    resistance_after = next(
        item for item in after["items"] if item["code"] == "resistance-baseline"
    )
    assert resistance_after["completed"] == 1
    assert resistance_after["remaining"] == 2
    assert after["training_completed"] == 1
    assert after["adherence"] == 11.1
    assert after["recent_sessions"][0]["item_code"] == "resistance-baseline"

    credits = client.get("/credits", headers=auth_headers)
    assert credits.json()["balance"] == 30


def test_alert_countermeasures_link_to_training_items(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    db_session: Session,
    content_seed: None,
) -> None:
    _alert(db_session, test_user, "R7", "Red-flag symptom reported", severity="critical")
    _alert(db_session, test_user, "R4", "Sleep debt is accumulating")
    _alert(db_session, test_user, "trend-hrv_rmssd", "HRV is below your baseline")

    response = client.get("/alerts", headers=auth_headers)
    assert response.status_code == 200
    alerts = {alert["rule_id"]: alert for alert in response.json()}
    assert alerts["R7"]["countermeasure"]["code"] == "recovery-check"
    assert alerts["R4"]["countermeasure"]["code"] == "sleep-hygiene"
    assert alerts["trend-hrv_rmssd"]["countermeasure"]["code"] == "sleep-hygiene"


def test_lunar_profile_changes_the_bone_load_target(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    db_session: Session,
    content_seed: None,
) -> None:
    create_crew_with_member(db_session, test_user, profile="lunar_surface")

    plan = client.get("/training/plan", headers=auth_headers)
    assert plan.status_code == 200
    body = plan.json()
    assert body["profile"] == "lunar_surface"
    assert body["profile_assigned"] is True
    bone = next(item for item in body["items"] if item["code"] == "bone-load")
    assert bone["target_per_week"] == 3
    aerobic = next(item for item in body["items"] if item["code"] == "aerobic-interval")
    assert aerobic["target_per_week"] == 1

    roster = client.get("/training/roster", headers=auth_headers)
    assert roster.status_code == 200
    assert roster.json()["profile"] == "lunar_surface"
    assert "bone loading" in next(
        item for item in roster.json()["items"] if item["kind"] == "checkin"
    )["detail"].lower()
