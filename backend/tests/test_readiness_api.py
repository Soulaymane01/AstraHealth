from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from tests.helpers import add_series


def test_readiness_endpoint_computes_on_demand(
    client: TestClient,
    auth_headers: dict[str, str],
    metric_definitions: None,
    test_user: User,
    db_session: Session,
) -> None:
    reference = datetime.now(UTC) - timedelta(minutes=1)
    add_series(db_session, test_user, "heart_rate", 60, 80, reference)

    response = client.get("/readiness", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 10.0
    assert body["status"] == "critical"
    assert body["factors"][0]["metric"] == "heart_rate"


def test_readiness_history_and_compute_endpoints(
    client: TestClient,
    auth_headers: dict[str, str],
    metric_definitions: None,
    test_user: User,
    db_session: Session,
) -> None:
    reference = datetime.now(UTC) - timedelta(minutes=1)
    add_series(db_session, test_user, "heart_rate", 60, 72, reference)

    computed = client.post("/readiness/compute", headers=auth_headers)
    assert computed.status_code == 200

    history = client.get("/readiness/history", headers=auth_headers)
    assert history.status_code == 200
    assert len(history.json()) >= 1


def test_alert_ack_flow(
    client: TestClient,
    auth_headers: dict[str, str],
    metric_definitions: None,
    test_user: User,
    db_session: Session,
) -> None:
    reference = datetime.now(UTC) - timedelta(minutes=1)
    add_series(db_session, test_user, "hrv_rmssd", 55, 35, reference)

    computed = client.post("/readiness/compute", headers=auth_headers)
    assert computed.status_code == 200

    active = client.get("/alerts", headers=auth_headers)
    assert active.status_code == 200
    alerts = active.json()
    assert len(alerts) >= 1
    alert_id = alerts[0]["id"]

    acknowledged = client.post(f"/alerts/{alert_id}/ack", headers=auth_headers)
    assert acknowledged.status_code == 200
    assert acknowledged.json()["status"] == "acknowledged"

    active_after = client.get("/alerts", headers=auth_headers)
    assert active_after.status_code == 200
    assert all(item["id"] != alert_id for item in active_after.json())


def test_domain_detail_endpoint(
    client: TestClient,
    auth_headers: dict[str, str],
    metric_definitions: None,
    test_user: User,
    db_session: Session,
) -> None:
    reference = datetime.now(UTC) - timedelta(minutes=1)
    add_series(db_session, test_user, "heart_rate", 60, 80, reference)

    response = client.get("/readiness/domains/cardiovascular", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["domain"] == "cardiovascular"
    assert body["score"] == 10.0
    assert body["status"] == "critical"
    assert body["metrics"][0]["metric"] == "heart_rate"
    assert body["metrics"][0]["status"] == "critical"


def test_domain_detail_rejects_an_empty_domain(
    client: TestClient,
    auth_headers: dict[str, str],
    metric_definitions: None,
    test_user: User,
    db_session: Session,
) -> None:
    reference = datetime.now(UTC) - timedelta(minutes=1)
    add_series(db_session, test_user, "heart_rate", 60, 72, reference)

    response = client.get("/readiness/domains/sleep", headers=auth_headers)

    assert response.status_code == 404
