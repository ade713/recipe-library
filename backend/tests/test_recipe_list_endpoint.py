from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import create_app
from app.models import Base, Recipe, RecipeIngredient, Tag, User


def test_list_recipes_endpoint_returns_only_current_users_recipes() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        current_user = User(email="current@example.com", password_hash="test-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        current_user_recipe = Recipe(
            user=current_user,
            title="Tomato Soup",
            is_favorite=True,
            ingredients=[
                RecipeIngredient(
                    position=1,
                    original_text="2 cloves garlic",
                )
            ],
            tags=[Tag(user=current_user, name="Dinner")],
        )
        other_recipe = Recipe(user=other_user, title="Secret Cake")
        session.add_all([current_user_recipe, other_recipe])
        session.commit()
        current_user_id = current_user.id
        current_user_recipe_id = current_user_recipe.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    access_token = create_access_token(str(current_user_id))
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/recipes", headers=headers)
            title_search_response = client.get(
                "/api/v1/recipes",
                params={"q": "TOMATO"},
                headers=headers,
            )
            ingredient_search_response = client.get(
                "/api/v1/recipes",
                params={"ingredient": "GARLIC"},
                headers=headers,
            )
            missing_search_response = client.get(
                "/api/v1/recipes",
                params={"q": "missing", "ingredient": "missing"},
                headers=headers,
            )
    finally:
        app.dependency_overrides.clear()

    expected_response = {
        "items": [
            {
                "id": str(current_user_recipe_id),
                "title": "Tomato Soup",
                "image_url": None,
                "total_time_minutes": None,
                "base_servings": None,
                "is_favorite": True,
                "tags": ["Dinner"],
            }
        ]
    }

    assert response.status_code == 200
    assert response.json() == expected_response
    assert title_search_response.status_code == 200
    assert title_search_response.json() == expected_response
    assert ingredient_search_response.status_code == 200
    assert ingredient_search_response.json() == expected_response
    assert missing_search_response.status_code == 200
    assert missing_search_response.json() == {"items": []}
