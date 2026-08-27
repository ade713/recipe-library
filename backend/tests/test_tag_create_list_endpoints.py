from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import create_app
from app.models import Base, Tag, User


def test_tag_create_and_list_endpoints_are_scoped_to_current_user() -> None:
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
            tags=[Tag(name="Dinner")],
        )
        other_user = User(
            email="other@example.com",
            password_hash="other-password-hash",
            tags=[Tag(name="Quick")],
        )
        session.add_all([current_user, other_user])
        session.commit()
        current_user_id = current_user.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    access_token = create_access_token(str(current_user_id))
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        with TestClient(app) as client:
            create_response = client.post(
                "/api/v1/tags",
                headers=headers,
                json={"name": "Quick"},
            )
            duplicate_response = client.post(
                "/api/v1/tags",
                headers=headers,
                json={"name": "Dinner"},
            )
            list_response = client.get(
                "/api/v1/tags",
                headers=headers,
            )
    finally:
        app.dependency_overrides.clear()

    assert create_response.status_code == 201
    assert create_response.json()["name"] == "Quick"
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Tag already exists."}
    assert list_response.status_code == 200
    assert [item["name"] for item in list_response.json()["items"]] == [
        "Dinner",
        "Quick",
    ]

    with testing_session() as session:
        tags = list(
            session.scalars(
                select(Tag).join(User).where(User.email == "current@example.com")
            )
        )
        assert {tag.name for tag in tags} == {"Dinner", "Quick"}
