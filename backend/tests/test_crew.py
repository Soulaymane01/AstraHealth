from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ReadinessSnapshot, User
from tests.helpers import create_crew_with_member


def test_crew_privacy_filters_readiness_and_leaderboard_health(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    db_session: Session,
) -> None:
    other = create_crew_with_member(db_session, test_user, share_status="private")
    db_session.add(
        ReadinessSnapshot(
            user_id=other.id,
            computed_at=datetime.now(UTC) - timedelta(hours=1),
            score=55.0,
            status="caution",
            domain_scores={},
            factors=[],
            fired_rules=[],
        )
    )
    db_session.commit()

    roster = client.get("/crew", headers=auth_headers)
    assert roster.status_code == 200
    other_card = next(item for item in roster.json() if item["id"] == other.id)
    assert other_card["share_status"] == "private"
    assert other_card["readiness_status"] is None
    assert other_card["readiness_score"] is None

    leaderboard = client.get("/crew/leaderboard", headers=auth_headers)
    assert leaderboard.status_code == 200
    assert all("readiness_status" not in item for item in leaderboard.json())
    assert all("readiness_score" not in item for item in leaderboard.json())

    other.share_status = "status_only"
    db_session.commit()
    status_only = client.get("/crew", headers=auth_headers).json()
    other_card = next(item for item in status_only if item["id"] == other.id)
    assert other_card["readiness_status"] == "caution"
    assert other_card["readiness_score"] is None

    other.share_status = "full"
    db_session.commit()
    full = client.get("/crew", headers=auth_headers).json()
    other_card = next(item for item in full if item["id"] == other.id)
    assert other_card["readiness_status"] == "caution"
    assert other_card["readiness_score"] == 55.0
