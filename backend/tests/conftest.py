from collections.abc import Generator

import pytest
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import create_app
from app.models import Base


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
