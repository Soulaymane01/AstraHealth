from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from tests.helpers import add_series


def test_metric_series_returns_baseline_status_and_range(
    client: TestClient,
    auth_headers: dict[str, str],
    metric_definitions: None,
    test_user: User,
    db_session: Session,
) -> None:
    reference = datetime.now(UTC) - timedelta(minutes=1)
    add_series(db_session, test_user, "heart_rate", 60, 80, reference)

    response = client.get(
        "/metrics/heart_rate/series", params={"days": 7}, headers=auth_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["metric"]["code"] == "heart_rate"
    assert body["metric"]["unit"] == "bpm"
    assert body["range_days"] == 7
    assert len(body["points"]) == 2
    assert body["baseline"]["points"] == 5
    assert body["baseline"]["center"] == 60
    assert body["baseline"]["sd"] == 4
    assert body["baseline"]["lower"] == 56
    assert body["baseline"]["upper"] == 64
    assert body["reference"] == {"lower": 50, "upper": 100}
    assert body["latest"]["value"] == 80
    assert body["previous"]["value"] == 60
    assert body["delta"] == 20
    assert body["z"] == 5.0
    assert body["subscore"] == 10.0
    assert body["status"] == "critical"
    assert body["stale"] is False
    assert body["latest_in_range"] is True
    assert body["stats"]["count"] == 2
    assert body["stats"]["distinct_days"] == 2


def test_metric_series_handles_an_empty_range(
    client: TestClient,
    auth_headers: dict[str, str],
    metric_definitions: None,
) -> None:
    response = client.get(
        "/metrics/heart_rate/series", params={"days": 30}, headers=auth_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["points"] == []
    assert body["baseline"] is None
    assert body["latest"] is None
    assert body["previous"] is None
    assert body["status"] == "unknown"
    assert body["stale"] is False
    assert body["latest_in_range"] is False
    assert body["stats"] == {
        "count": 0,
        "distinct_days": 0,
        "min": None,
        "max": None,
        "mean": None,
    }


def test_metric_series_rejects_unknown_metric_and_range(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    unknown = client.get("/metrics/not_a_metric/series", headers=auth_headers)
    assert unknown.status_code == 404

    invalid_range = client.get(
        "/metrics/heart_rate/series", params={"days": 14}, headers=auth_headers
    )
    assert invalid_range.status_code == 422


def test_domain_summary_aggregates_metrics_and_matches_readiness(
    client: TestClient,
    auth_headers: dict[str, str],
    metric_definitions: None,
    test_user: User,
    db_session: Session,
) -> None:
    reference = datetime.now(UTC) - timedelta(minutes=1)
    add_series(db_session, test_user, "heart_rate", 60, 80, reference)
    add_series(db_session, test_user, "hrv_rmssd", 55, 55, reference)

    response = client.get(
        "/domains/cardiovascular", params={"days": 30}, headers=auth_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["domain"] == "cardiovascular"
    assert body["label"] == "Cardiovascular"
    assert body["score"] == 55.0
    assert body["status"] == "caution"
    assert body["covered_metrics"] == 2
    assert body["total_metrics"] == 5

    metrics = {item["metric"]: item for item in body["metrics"]}
    assert set(metrics) == {
        "heart_rate",
        "hrv_rmssd",
        "systolic_bp",
        "diastolic_bp",
        "orthostatic_hr_rise",
    }
    assert metrics["heart_rate"]["status"] == "critical"
    assert metrics["heart_rate"]["z"] == 5.0
    assert metrics["heart_rate"]["subscore"] == 10.0
    assert metrics["heart_rate"]["point_count"] == 6
    assert len(metrics["heart_rate"]["sparkline"]) == 6
    assert metrics["hrv_rmssd"]["status"] == "nominal"
    assert metrics["hrv_rmssd"]["subscore"] == 100.0
    assert metrics["systolic_bp"]["status"] == "unknown"
    assert metrics["systolic_bp"]["point_count"] == 0

    readiness = client.get("/readiness/domains/cardiovascular", headers=auth_headers)
    assert readiness.status_code == 200
    assert readiness.json()["score"] == body["score"]
    assert readiness.json()["status"] == body["status"]


def test_domain_summary_handles_no_data_and_unknown_domain(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    empty = client.get("/domains/sleep", headers=auth_headers)

    assert empty.status_code == 200
    body = empty.json()
    assert body["score"] is None
    assert body["status"] == "unknown"
    assert body["covered_metrics"] == 0
    assert body["total_metrics"] == 3
    assert all(item["status"] == "unknown" for item in body["metrics"])

    unknown = client.get("/domains/not_a_domain", headers=auth_headers)
    assert unknown.status_code == 404


def test_metric_series_separates_chart_points_from_the_current_window(
    client: TestClient,
    auth_headers: dict[str, str],
    metric_definitions: None,
    test_user: User,
    db_session: Session,
) -> None:
    reference = datetime.now(UTC) - timedelta(days=40)
    add_series(db_session, test_user, "systolic_bp", 115, 115, reference)

    response = client.get(
        "/metrics/systolic_bp/series", params={"days": 90}, headers=auth_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["points"]) == 6
    assert body["latest"] is None
    assert body["previous"] is None
    assert body["status"] == "unknown"
    assert body["latest_in_range"] is False
    assert body["stats"]["count"] == 6
