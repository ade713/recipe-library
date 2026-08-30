from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Base, Recipe, RecipeIngredient, User
from app.repositories.recipe_repository import list_recipes


def test_list_recipes_searches_titles_within_user_scope() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        session.add_all(
            [
                Recipe(user=owner, title="Chicken Soup"),
                Recipe(user=owner, title="Garden Salad"),
                Recipe(user=other_user, title="Secret Chicken"),
            ]
        )
        session.commit()

        results = list_recipes(session, user_id=owner.id, q="CHICKEN")

        assert [recipe.title for recipe in results] == ["Chicken Soup"]


def test_list_recipes_searches_ingredients_within_user_scope() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        session.add_all(
            [
                Recipe(
                    user=owner,
                    title="Tomato Soup",
                    ingredients=[
                        RecipeIngredient(
                            position=1,
                            original_text="2 cloves garlic",
                        )
                    ],
                ),
                Recipe(
                    user=owner,
                    title="Garden Salad",
                    ingredients=[
                        RecipeIngredient(
                            position=1,
                            original_text="1 cucumber",
                        )
                    ],
                ),
                Recipe(
                    user=other_user,
                    title="Secret Bread",
                    ingredients=[
                        RecipeIngredient(
                            position=1,
                            original_text="1 clove garlic",
                        )
                    ],
                ),
            ]
        )
        session.commit()

        results = list_recipes(
            session,
            user_id=owner.id,
            ingredient="GARLIC",
        )

        assert [recipe.title for recipe in results] == ["Tomato Soup"]
