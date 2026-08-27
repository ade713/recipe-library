from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import verify_password
from app.main import create_app
from app.models import Base, User


def test_registration_endpoint_creates_user_and_rejects_duplicate_email() -> None:
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

    try:
        with TestClient(app) as client:
            create_response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "Cook@Example.COM",
                    "password": "correct horse battery staple",
                },
            )
            duplicate_response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "cook@example.com",
                    "password": "another secure password",
                },
            )
            invalid_response = client.post(
                "/api/v1/auth/register",
                json={"email": "cook-two@example.com", "password": "short"},
            )
    finally:
        app.dependency_overrides.clear()

    assert create_response.status_code == 201
    assert create_response.json()["email"] == "cook@example.com"
    assert "password" not in create_response.json()
    assert "password_hash" not in create_response.json()
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Email is already registered."}
    assert invalid_response.status_code == 422

    with testing_session() as session:
        user = session.scalar(select(User).where(User.email == "cook@example.com"))
        assert user is not None
        assert verify_password("correct horse battery staple", user.password_hash)
        user_count = session.scalar(select(func.count()).select_from(User))
        assert user_count == 1
