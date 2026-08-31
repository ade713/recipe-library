from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Base, Recipe, User
from app.repositories.recipe_repository import list_recipes
from app.schemas.recipe import RecipeSort


def test_list_recipes_applies_supported_sort_orders() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    now = datetime.now(UTC)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        session.add_all(
            [
                Recipe(
                    user=owner,
                    title="Zucchini Soup",
                    total_time_minutes=20,
                    created_at=now,
                ),
                Recipe(
                    user=owner,
                    title="apple Salad",
                    total_time_minutes=10,
                    created_at=now - timedelta(days=2),
                ),
                Recipe(
                    user=owner,
                    title="Bread",
                    total_time_minutes=None,
                    created_at=now - timedelta(days=1),
                ),
            ]
        )
        session.commit()

        recent_results = list_recipes(
            session,
            user_id=owner.id,
            sort=RecipeSort.RECENT,
        )
        title_results = list_recipes(
            session,
            user_id=owner.id,
            sort=RecipeSort.TITLE,
        )
        time_results = list_recipes(
            session,
            user_id=owner.id,
            sort=RecipeSort.TIME,
        )

        assert [recipe.title for recipe in recent_results] == [
            "Zucchini Soup",
            "Bread",
            "apple Salad",
        ]
        assert [recipe.title for recipe in title_results] == [
            "apple Salad",
            "Bread",
            "Zucchini Soup",
        ]
        assert [recipe.title for recipe in time_results] == [
            "apple Salad",
            "Zucchini Soup",
            "Bread",
        ]
