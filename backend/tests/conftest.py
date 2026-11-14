from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import User

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


@pytest.fixture(autouse=True)
def reset_rate_limits() -> Generator[None, None, None]:
    from app.core.rate_limit import clear_rate_limits

    clear_rate_limits()
    yield
    clear_rate_limits()


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def metric_definitions(db_session: Session) -> None:
    from app.db.seed import seed_metric_definitions

    seed_metric_definitions(db_session)
    db_session.commit()


@pytest.fixture()
def content_seed(db_session: Session) -> None:
    from app.db.content import ACHIEVEMENTS, KNOWLEDGE_ARTICLES, QUIZZES, TRAINING_ITEMS
    from app.models import Achievement, KnowledgeArticle, Quiz, TrainingItem

    for item in ACHIEVEMENTS:
        db_session.add(Achievement(**item))
    for item in QUIZZES:
        db_session.add(Quiz(**item))
    for item in TRAINING_ITEMS:
        db_session.add(TrainingItem(**item))
    for article in KNOWLEDGE_ARTICLES:
        db_session.add(KnowledgeArticle(**article))
    db_session.commit()


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "test-password",
            "full_name": "Test User",
        },
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def test_user(db_session: Session, auth_headers: dict[str, str]) -> User:
    user = db_session.scalar(select(User).where(User.email == "test@example.com"))
    assert user is not None
    return user
