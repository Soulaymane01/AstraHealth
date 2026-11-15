from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User


def test_role_header_selects_the_astronaut(client: TestClient, test_user: User) -> None:
    response = client.get("/me", headers={"X-Astra-Role": "astronaut"})
    assert response.status_code == 200
    assert response.json()["role"] == "commander"
    assert response.json()["full_name"] == test_user.full_name


def test_role_header_selects_the_surgeon(
    client: TestClient, db_session: Session, test_user: User
) -> None:
    surgeon = User(
        full_name="Dr. Test",
        role="flight_surgeon",
        share_status="private",
    )
    db_session.add(surgeon)
    db_session.commit()

    response = client.get("/me", headers={"X-Astra-Role": "surgeon"})
    assert response.status_code == 200
    assert response.json()["role"] == "flight_surgeon"
    assert response.json()["full_name"] == "Dr. Test"


def test_invalid_role_is_rejected(client: TestClient) -> None:
    response = client.get("/me", headers={"X-Astra-Role": "admin"})
    assert response.status_code == 400


def test_privacy_update(client: TestClient, auth_headers: dict[str, str]) -> None:
    current = client.get("/me/privacy", headers=auth_headers)
    assert current.status_code == 200
    assert current.json()["share_status"] == "private"

    updated = client.patch("/me/privacy", json={"share_status": "full"}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["share_status"] == "full"

    invalid = client.patch("/me/privacy", json={"share_status": "everyone"}, headers=auth_headers)
    assert invalid.status_code == 422
