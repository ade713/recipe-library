from collections.abc import Generator
from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token, hash_password
from app.main import create_app
from app.models import Base, User


def test_me_endpoint_returns_authenticated_user() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        user = User(
            email="cook@example.com",
            password_hash=hash_password("correct horse battery staple"),
        )
        session.add(user)
        session.commit()
        user_id = user.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    token = create_access_token(str(user_id))

    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "id": str(user_id),
        "email": "cook@example.com",
    }


def test_me_endpoint_rejects_missing_invalid_expired_and_unknown_user_tokens() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    expired_token = create_access_token(
        str(uuid4()),
        expires_delta=timedelta(seconds=-1),
    )
    unknown_user_token = create_access_token(str(uuid4()))

    try:
        with TestClient(app) as client:
            missing_response = client.get("/api/v1/auth/me")
            invalid_response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer not-a-token"},
            )
            expired_response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {expired_token}"},
            )
            unknown_user_response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {unknown_user_token}"},
            )
    finally:
        app.dependency_overrides.clear()

    for response in (
        missing_response,
        invalid_response,
        expired_response,
        unknown_user_response,
    ):
        assert response.status_code == 401
        assert response.headers["www-authenticate"] == "Bearer"
