from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import decode_access_token, hash_password
from app.main import create_app
from app.models import Base, User


def test_login_endpoint_returns_access_token_for_valid_credentials() -> None:
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

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/auth/login",
                json={
                    "email": "Cook@Example.COM",
                    "password": "correct horse battery staple",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert decode_access_token(body["access_token"]) == str(user_id)


def test_login_endpoint_returns_same_error_for_invalid_credentials() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        session.add(
            User(
                email="cook@example.com",
                password_hash=hash_password("correct horse battery staple"),
            )
        )
        session.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            wrong_password_response = client.post(
                "/api/v1/auth/login",
                json={"email": "cook@example.com", "password": "wrong password"},
            )
            unknown_email_response = client.post(
                "/api/v1/auth/login",
                json={
                    "email": "missing@example.com",
                    "password": "correct horse battery staple",
                },
            )
    finally:
        app.dependency_overrides.clear()

    expected_error = {"detail": "Invalid email or password."}
    assert wrong_password_response.status_code == 401
    assert wrong_password_response.json() == expected_error
    assert unknown_email_response.status_code == 401
    assert unknown_email_response.json() == expected_error
