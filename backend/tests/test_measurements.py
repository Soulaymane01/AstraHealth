from fastapi.testclient import TestClient


def test_metric_catalog_is_seeded(client: TestClient, metric_definitions: None) -> None:
    response = client.get("/metrics/definitions")

    assert response.status_code == 200
    catalog = response.json()
    assert len(catalog) == 24
    codes = {item["code"] for item in catalog}
    assert {"heart_rate", "hrv_rmssd", "sleep_duration_h", "mood_score"} <= codes


def test_create_and_list_measurements(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    created = client.post(
        "/measurements",
        json={"metric_code": "heart_rate", "value": 72},
        headers=auth_headers,
    )
    assert created.status_code == 201
    assert created.json()["unit"] == "bpm"

    batch = client.post(
        "/measurements/batch",
        json={
            "measurements": [
                {"metric_code": "hrv_rmssd", "value": 45},
                {"metric_code": "sleep_duration_h", "value": 7.2},
            ]
        },
        headers=auth_headers,
    )
    assert batch.status_code == 201
    assert len(batch.json()) == 2

    listing = client.get("/measurements", params={"metric": "heart_rate"}, headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["value"] == 72


def test_unknown_metric_is_rejected(
    client: TestClient, auth_headers: dict[str, str], metric_definitions: None
) -> None:
    response = client.post(
        "/measurements",
        json={"metric_code": "not_a_metric", "value": 1},
        headers=auth_headers,
    )
    assert response.status_code == 404
