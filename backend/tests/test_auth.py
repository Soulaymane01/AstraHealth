from fastapi.testclient import TestClient


def test_register_login_refresh_and_me(client: TestClient) -> None:
    register = client.post(
        "/auth/register",
        json={
            "email": "pilot@example.com",
            "password": "strong-password",
            "full_name": "Pilot",
        },
    )

    assert register.status_code == 201
    body = register.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "pilot@example.com"
    assert body["user"]["share_status"] == "private"

    me = client.get("/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "Pilot"

    refreshed = client.post("/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]

    login = client.post(
        "/auth/login", json={"email": "pilot@example.com", "password": "strong-password"}
    )
    assert login.status_code == 200
    assert login.json()["user"]["full_name"] == "Pilot"


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    payload = {
        "email": "duplicate@example.com",
        "password": "strong-password",
        "full_name": "Duplicate",
    }
    assert client.post("/auth/register", json=payload).status_code == 201
    assert client.post("/auth/register", json=payload).status_code == 409


def test_invalid_login_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/auth/login", json={"email": "missing@example.com", "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_invalid_token_is_rejected(client: TestClient) -> None:
    response = client.get("/me", headers={"Authorization": "Bearer not-a-token"})
    assert response.status_code == 401


def test_endpoints_require_authentication(client: TestClient) -> None:
    assert client.get("/me").status_code == 401
    assert client.get("/measurements").status_code == 401
    assert client.get("/checkins").status_code == 401


def test_privacy_update(client: TestClient, auth_headers: dict[str, str]) -> None:
    current = client.get("/me/privacy", headers=auth_headers)
    assert current.status_code == 200
    assert current.json()["share_status"] == "private"

    updated = client.patch("/me/privacy", json={"share_status": "full"}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["share_status"] == "full"

    invalid = client.patch("/me/privacy", json={"share_status": "everyone"}, headers=auth_headers)
    assert invalid.status_code == 422


def test_login_rate_limit_after_repeated_failures(client: TestClient) -> None:
    payload = {"email": "rate-limited@example.com", "password": "wrong-password"}
    for _ in range(5):
        assert client.post("/auth/login", json=payload).status_code == 401

    blocked = client.post("/auth/login", json=payload)
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) >= 1


def test_register_rate_limit_per_client(client: TestClient) -> None:
    for index in range(5):
        response = client.post(
            "/auth/register",
            json={
                "email": f"rate-{index}@example.com",
                "password": "strong-password",
                "full_name": f"Rate {index}",
            },
        )
        assert response.status_code == 201

    blocked = client.post(
        "/auth/register",
        json={
            "email": "rate-blocked@example.com",
            "password": "strong-password",
            "full_name": "Rate Blocked",
        },
    )
    assert blocked.status_code == 429
