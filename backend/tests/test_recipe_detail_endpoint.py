from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import create_app
from app.models import Base, Recipe, RecipeIngredient, RecipeStep, RecipeTip, Tag, User


def test_recipe_detail_endpoint_returns_owned_recipe_and_hides_other_users() -> None:
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
            ingredients=[RecipeIngredient(position=1, original_text="2 cups tomatoes")],
            steps=[RecipeStep(position=1, instruction="Simmer the tomatoes.")],
            tips=[RecipeTip(position=1, tip="Finish with basil.")],
            tags=[Tag(user=current_user, name="Dinner")],
        )
        other_recipe = Recipe(user=other_user, title="Secret Cake")
        session.add_all([current_user_recipe, other_recipe])
        session.commit()
        current_user_id = current_user.id
        current_user_recipe_id = current_user_recipe.id
        other_recipe_id = other_recipe.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    access_token = create_access_token(str(current_user_id))
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        with TestClient(app) as client:
            detail_response = client.get(
                f"/api/v1/recipes/{current_user_recipe_id}",
                headers=headers,
            )
            hidden_response = client.get(
                f"/api/v1/recipes/{other_recipe_id}",
                headers=headers,
            )
    finally:
        app.dependency_overrides.clear()

    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["id"] == str(current_user_recipe_id)
    assert detail["title"] == "Tomato Soup"
    assert detail["ingredients"][0]["original_text"] == "2 cups tomatoes"
    assert detail["steps"][0]["instruction"] == "Simmer the tomatoes."
    assert detail["tips"][0]["tip"] == "Finish with basil."
    assert detail["tags"] == ["Dinner"]

    assert hidden_response.status_code == 404
    assert hidden_response.json() == {"detail": "Recipe not found."}
