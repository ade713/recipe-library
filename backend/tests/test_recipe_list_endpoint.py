from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import create_app
from app.models import Base, Recipe, Tag, User
from app.repositories.user_repository import DEV_USER_EMAIL


def test_list_recipes_endpoint_returns_only_dev_users_recipes() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        dev_user = User(email=DEV_USER_EMAIL, password_hash="dev-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        dev_recipe = Recipe(
            user=dev_user,
            title="Tomato Soup",
            is_favorite=True,
            tags=[Tag(user=dev_user, name="Dinner")],
        )
        other_recipe = Recipe(user=other_user, title="Secret Cake")
        session.add_all([dev_recipe, other_recipe])
        session.commit()
        dev_recipe_id = dev_recipe.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/recipes")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "id": str(dev_recipe_id),
                "title": "Tomato Soup",
                "image_url": None,
                "total_time_minutes": None,
                "base_servings": None,
                "is_favorite": True,
                "tags": ["Dinner"],
            }
        ]
    }
