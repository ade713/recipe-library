from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Base, Recipe, User
from app.repositories.recipe_repository import get_recipe_by_source_url


def test_get_recipe_by_source_url_is_scoped_to_user() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(
            email="owner@example.com",
            password_hash="test-hash",
        )
        other_user = User(
            email="other@example.com",
            password_hash="test-hash",
        )
        session.add_all([owner, other_user])
        session.flush()
        recipe = Recipe(
            user_id=owner.id,
            title="Tomato Soup",
            source_url="https://example.com/recipe",
        )
        session.add(recipe)
        session.flush()

        owner_result = get_recipe_by_source_url(
            session,
            user_id=owner.id,
            source_url="https://example.com/recipe",
        )
        other_user_result = get_recipe_by_source_url(
            session,
            user_id=other_user.id,
            source_url="https://example.com/recipe",
        )
        different_url_result = get_recipe_by_source_url(
            session,
            user_id=owner.id,
            source_url="https://example.com/another-recipe",
        )

        assert owner_result is recipe
        assert other_user_result is None
        assert different_url_result is None
