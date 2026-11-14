from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Alert,
    Checkin,
    TrainingSession,
    User,
    UserAchievement,
)


def test_mission_log_combines_all_event_types(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    db_session: Session,
    content_seed: None,
) -> None:
    now = datetime.now(UTC)

    db_session.add(
        Checkin(
            user_id=test_user.id,
            started_at=now - timedelta(hours=5),
            completed_at=now - timedelta(hours=5),
            status="completed",
            notes="Skipped: Training & Nutrition.",
        )
    )
    db_session.add(
        Alert(
            user_id=test_user.id,
            severity="caution",
            rule_id="test-rule",
            title="Test alert",
            rationale="Test rationale.",
            recommended_action="Test action.",
            status="active",
            created_at=now - timedelta(hours=4),
        )
    )
    db_session.add(
        TrainingSession(
            user_id=test_user.id,
            item_code="resistance-baseline",
            completed_at=now - timedelta(hours=3),
            duration_min=35,
            rpe=6,
        )
    )
    db_session.add(
        UserAchievement(
            user_id=test_user.id,
            achievement_code="first-check",
            unlocked_at=now - timedelta(hours=2),
        )
    )
    db_session.commit()

    response = client.get("/mission/log", headers=auth_headers)
    assert response.status_code == 200
    events = response.json()
    assert {event["type"] for event in events} == {
        "checkin",
        "alert",
        "training",
        "achievement",
    }
    assert events == sorted(events, key=lambda event: event["at"], reverse=True)

    limited = client.get("/mission/log", params={"limit": 2}, headers=auth_headers)
    assert limited.status_code == 200
    assert len(limited.json()) == 2
