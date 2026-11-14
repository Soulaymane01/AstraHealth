from datetime import UTC, date, datetime

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CreditEvent, User
from app.services.gamification import award_credits, streak_read, update_streak


def test_streak_uses_one_grace_day_and_awards_milestones(
    db_session: Session, test_user: User
) -> None:
    now = datetime(2026, 1, 20, 12, tzinfo=UTC)

    first = update_streak(db_session, test_user, "checkin", date(2026, 1, 1), now)
    assert first.streak.current == 1
    assert first.streak.grace_used is False

    second = update_streak(db_session, test_user, "checkin", date(2026, 1, 2), now)
    assert second.streak.current == 2

    # One missed day is allowed once.
    grace = update_streak(db_session, test_user, "checkin", date(2026, 1, 4), now)
    assert grace.streak.current == 3
    assert grace.streak.grace_used is True

    continued = update_streak(db_session, test_user, "checkin", date(2026, 1, 5), now)
    assert continued.streak.current == 4

    # The grace day is spent, so a second gap resets the streak.
    reset = update_streak(db_session, test_user, "checkin", date(2026, 1, 7), now)
    assert reset.streak.current == 1
    assert reset.streak.grace_used is False
    assert reset.streak.longest == 4

    for day in range(8, 13):
        update_streak(db_session, test_user, "checkin", date(2026, 1, day), now)
    milestone = update_streak(db_session, test_user, "checkin", date(2026, 1, 13), now)
    assert milestone.streak.current == 7
    assert milestone.credits_awarded == 50
    assert milestone.milestone is True
    assert streak_read(milestone.streak).next_milestone == 14

    same_day = update_streak(db_session, test_user, "checkin", date(2026, 1, 13), now)
    assert same_day.credits_awarded == 0
    assert same_day.streak.current == 7

    credits = db_session.scalar(select(CreditEvent).where(CreditEvent.ref_type == "streak"))
    assert credits is not None
    assert credits.amount == 50


def test_reward_redemption_deducts_and_appears_in_the_log(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    db_session: Session,
    content_seed: None,
) -> None:
    award_credits(
        db_session,
        test_user.id,
        500,
        "Seed balance",
        ref_type="test",
        ref_id="seed",
    )
    db_session.commit()

    rewards = client.get("/rewards", headers=auth_headers)
    assert rewards.status_code == 200
    family_call = next(item for item in rewards.json() if item["code"] == "family-call")
    assert family_call["state"] == "available"

    redeemed = client.post("/rewards/family-call/redeem", headers=auth_headers)
    assert redeemed.status_code == 200
    body = redeemed.json()
    assert body["balance"] == 380
    assert body["redemption"]["reward_code"] == "family-call"
    assert body["rank"]["balance"] == 380

    credits = client.get("/credits", headers=auth_headers)
    assert credits.status_code == 200
    ledger = credits.json()
    assert ledger["balance"] == 380
    assert ledger["lifetime_credited"] == 500
    assert ledger["total_spent"] == 120
    assert ledger["entries"][0]["amount"] == -120
    assert ledger["entries"][0]["ref_type"] == "redemption"

    log = client.get("/mission/log", headers=auth_headers)
    assert log.status_code == 200
    assert any(event["type"] == "redemption" for event in log.json())

    duplicate = client.post("/rewards/family-call/redeem", headers=auth_headers)
    assert duplicate.status_code == 409


def test_reward_redemption_rejects_an_insufficient_balance(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    content_seed: None,
) -> None:
    del test_user
    response = client.post("/rewards/extra-coffee/redeem", headers=auth_headers)
    assert response.status_code == 400
    assert "40 more Flight Credits" in response.json()["detail"]


def test_training_session_awards_credits_and_starts_a_streak(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    content_seed: None,
) -> None:
    del test_user
    response = client.post(
        "/training/sessions",
        json={
            "item_code": "resistance-baseline",
            "duration_min": 35,
            "rpe": 6,
        },
        headers=auth_headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["session"]["item_name"] == "Resistance baseline"
    assert body["credits_awarded"] == 30
    assert body["streak"]["kind"] == "training"
    assert body["streak"]["current"] == 1

    credits = client.get("/credits", headers=auth_headers)
    assert credits.json()["balance"] == 30

    summary = client.get("/gamification/summary", headers=auth_headers)
    assert summary.status_code == 200
    assert summary.json()["training_streak"]["current"] == 1
