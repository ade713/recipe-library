from collections.abc import Generator
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import create_app
from app.models import Base, Recipe, User


def test_list_recipes_endpoint_applies_and_validates_sort_order() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)
    now = datetime.now(UTC)

    with testing_session() as session:
        current_user = User(
            email="current@example.com",
            password_hash="test-hash",
        )
        session.add_all(
            [
                Recipe(
                    user=current_user,
                    title="Zucchini Soup",
                    total_time_minutes=20,
                    created_at=now,
                ),
                Recipe(
                    user=current_user,
                    title="apple Salad",
                    total_time_minutes=10,
                    created_at=now - timedelta(days=2),
                ),
                Recipe(
                    user=current_user,
                    title="Bread",
                    total_time_minutes=None,
                    created_at=now - timedelta(days=1),
                ),
            ]
        )
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
            recent_response = client.get(
                "/api/v1/recipes",
                params={"sort": "recent"},
                headers=headers,
            )
            title_response = client.get(
                "/api/v1/recipes",
                params={"sort": "title"},
                headers=headers,
            )
            time_response = client.get(
                "/api/v1/recipes",
                params={"sort": "time"},
                headers=headers,
            )
            invalid_response = client.get(
                "/api/v1/recipes",
                params={"sort": "oldest"},
                headers=headers,
            )
    finally:
        app.dependency_overrides.clear()

    for response in (recent_response, title_response, time_response):
        assert response.status_code == 200

    assert [item["title"] for item in recent_response.json()["items"]] == [
        "Zucchini Soup",
        "Bread",
        "apple Salad",
    ]
    assert [item["title"] for item in title_response.json()["items"]] == [
        "apple Salad",
        "Bread",
        "Zucchini Soup",
    ]
    assert [item["title"] for item in time_response.json()["items"]] == [
        "apple Salad",
        "Zucchini Soup",
        "Bread",
    ]
    assert invalid_response.status_code == 422
