from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import create_app
from app.models import Base, User


def test_logout_endpoint_accepts_authenticated_user() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        current_user = User(
            email="current@example.com",
            password_hash="test-hash",
        )
        session.add(current_user)
        session.commit()
        current_user_id = current_user.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    access_token = create_access_token(str(current_user_id))

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/auth/logout",
                headers={"Authorization": f"Bearer {access_token}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 204
    assert response.content == b""


def test_logout_endpoint_rejects_missing_and_invalid_tokens() -> None:
    app = create_app()

    with TestClient(app) as client:
        missing_response = client.post("/api/v1/auth/logout")
        invalid_response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": "Bearer not-a-token"},
        )

    for response in (missing_response, invalid_response):
        assert response.status_code == 401
        assert response.headers["www-authenticate"] == "Bearer"
