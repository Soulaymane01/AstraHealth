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
def test_user(db_session: Session) -> User:
    user = db_session.scalar(select(User).where(User.role == "commander"))
    if user is None:
        user = User(
            full_name="Test User",
            role="commander",
            share_status="private",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture()
def auth_headers(test_user: User) -> dict[str, str]:
    return {"X-Astra-Role": "astronaut"}
