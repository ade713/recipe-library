from collections.abc import Generator
from uuid import UUID

import pytest
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import create_app
from app.models import Base, User

CURRENT_USER_EMAIL = "current@example.com"
TEST_PASSWORD_HASH = "test-hash"


@pytest.fixture
def testing_session() -> Generator[sessionmaker[Session], None, None]:
    """Provide a fresh SQLite session factory for each test."""
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    try:
        Base.metadata.create_all(engine)
        factory = sessionmaker(bind=engine, autoflush=False)
        yield factory
    finally:
        engine.dispose()


@pytest.fixture
def app(
    testing_session: sessionmaker[Session],
) -> Generator[FastAPI, None, None]:
    """Provide a test app whose requests use the isolated database."""

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    test_app = create_app()
    test_app.dependency_overrides[get_db] = override_get_db

    try:
        yield test_app
    finally:
        test_app.dependency_overrides.clear()


@pytest.fixture
def current_user_id(testing_session: sessionmaker[Session]) -> UUID:
    """Create a test user and return its persisted ID."""

    with testing_session() as session:
        current_user = User(
            email=CURRENT_USER_EMAIL,
            password_hash=TEST_PASSWORD_HASH,
        )
        session.add(current_user)
        session.commit()
        current_user_id = current_user.id
        return current_user_id


@pytest.fixture
def auth_headers(current_user_id: UUID) -> dict[str, str]:
    """Provide bearer authorization for the test user."""
    access_token = create_access_token(str(current_user_id))
    return {"Authorization": f"Bearer {access_token}"}
