from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Alert, User


def test_knowledge_index_filter_and_detail(
    client: TestClient, content_seed: None
) -> None:
    listing = client.get("/knowledge")
    assert listing.status_code == 200
    articles = listing.json()
    assert len(articles) == 9
    assert all("body_md" not in article for article in articles)

    cardiovascular = client.get("/knowledge", params={"domain": "Cardiovascular"})
    assert cardiovascular.status_code == 200
    assert {article["slug"] for article in cardiovascular.json()} == {
        "hrv-basics",
        "fluid-shifts",
    }

    detail = client.get("/knowledge/hrv-basics")
    assert detail.status_code == 200
    body = detail.json()
    assert body["title"] == "Why HRV falls before you feel tired"
    assert "21-day baseline" in body["body_md"]
    assert body["source_url"].startswith("https://")

    missing = client.get("/knowledge/not-an-article")
    assert missing.status_code == 404


def test_alert_knowledge_links(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user: User,
    db_session: Session,
    content_seed: None,
) -> None:
    now = datetime.now(UTC)
    for rule_id, title in [
        ("R4", "Sleep debt is accumulating"),
        ("R7", "Red-flag symptom reported"),
        ("trend-hrv_rmssd", "HRV is below your baseline"),
    ]:
        db_session.add(
            Alert(
                user_id=test_user.id,
                severity="caution",
                rule_id=rule_id,
                title=title,
                rationale="Test rationale.",
                recommended_action="Test action.",
                status="active",
                created_at=now - timedelta(minutes=5),
            )
        )
    db_session.commit()

    response = client.get("/alerts", headers=auth_headers)
    assert response.status_code == 200
    alerts = {alert["rule_id"]: alert for alert in response.json()}
    assert alerts["R4"]["knowledge_slug"] == "sleep-circadian"
    assert alerts["R7"]["knowledge_slug"] == "red-flags"
    assert alerts["trend-hrv_rmssd"]["knowledge_slug"] == "hrv-basics"
