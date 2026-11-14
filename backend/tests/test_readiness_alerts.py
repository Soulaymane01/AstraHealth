from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Alert, ReadinessSnapshot, User


def _user(db_session: Session) -> User:
    return db_session.query(User).filter(User.email == "test@example.com").one()


def test_readiness_requires_a_snapshot(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/readiness", headers=auth_headers)
    assert response.status_code == 404


def test_readiness_returns_the_latest_snapshot(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    user = _user(db_session)
    now = datetime.now(UTC)

    db_session.add_all(
        [
            ReadinessSnapshot(
                user_id=user.id,
                computed_at=now - timedelta(days=1),
                score=81,
                status="watch",
                domain_scores={"cardiovascular": 80},
                factors=[],
                fired_rules=[],
            ),
            ReadinessSnapshot(
                user_id=user.id,
                computed_at=now,
                score=76,
                status="watch",
                domain_scores={"cardiovascular": 74},
                factors=[
                    {
                        "metric": "hrv_rmssd",
                        "label": "HRV",
                        "value": 38,
                        "z": -2.1,
                        "contribution": -14,
                    }
                ],
                fired_rules=[],
            ),
        ]
    )
    db_session.commit()

    response = client.get("/readiness", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 76
    assert body["factors"][0]["label"] == "HRV"
    assert body["domain_scores"]["cardiovascular"] == 74


def test_alerts_are_filtered_by_status(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    user = _user(db_session)
    db_session.add_all(
        [
            Alert(
                user_id=user.id,
                severity="caution",
                rule_id="trend-hrv",
                title="Active alert",
                rationale="Rationale",
                recommended_action="Action",
                status="active",
            ),
            Alert(
                user_id=user.id,
                severity="watch",
                rule_id="trend-hydration",
                title="Acknowledged alert",
                rationale="Rationale",
                recommended_action="Action",
                status="acknowledged",
            ),
        ]
    )
    db_session.commit()

    active = client.get("/alerts", headers=auth_headers)
    assert active.status_code == 200
    assert len(active.json()) == 1
    assert active.json()[0]["title"] == "Active alert"

    acknowledged = client.get("/alerts", params={"status": "acknowledged"}, headers=auth_headers)
    assert acknowledged.status_code == 200
    assert acknowledged.json()[0]["title"] == "Acknowledged alert"


def test_readiness_without_a_baseline_still_persists_rule_alerts(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    for code, value in (("body_temp_c", 38.5), ("heart_rate", 120)):
        response = client.post(
            "/measurements",
            json={"metric_code": code, "value": value},
            headers=auth_headers,
        )
        assert response.status_code == 201

    readiness = client.get("/readiness", headers=auth_headers)
    assert readiness.status_code == 404

    alerts = client.get("/alerts", headers=auth_headers)
    assert alerts.status_code == 200
    assert "R1" in {alert["rule_id"] for alert in alerts.json()}


def test_alerts_are_ordered_by_severity_then_recency(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    user = _user(db_session)
    now = datetime.now(UTC)
    db_session.add_all(
        [
            Alert(
                user_id=user.id,
                severity="watch",
                rule_id="trend-new-watch",
                title="Newest watch",
                rationale="Rationale",
                recommended_action="Action",
                status="active",
                created_at=now,
            ),
            Alert(
                user_id=user.id,
                severity="critical",
                rule_id="R1",
                title="Older critical",
                rationale="Rationale",
                recommended_action="Action",
                status="active",
                created_at=now - timedelta(hours=2),
            ),
            Alert(
                user_id=user.id,
                severity="caution",
                rule_id="R4",
                title="Middle caution",
                rationale="Rationale",
                recommended_action="Action",
                status="active",
                created_at=now - timedelta(hours=1),
            ),
        ]
    )
    db_session.commit()

    response = client.get("/alerts", headers=auth_headers)

    assert response.status_code == 200
    assert [alert["title"] for alert in response.json()] == [
        "Older critical",
        "Middle caution",
        "Newest watch",
    ]
