from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Base, Recipe, RecipeIngredient, Tag, User
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


def test_list_recipes_applies_tag_favorite_and_maximum_time_filters() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        dinner_tag = Tag(user=owner, name="Dinner")
        side_tag = Tag(user=owner, name="Side")
        other_dinner_tag = Tag(user=other_user, name="Dinner")
        session.add_all(
            [
                Recipe(
                    user=owner,
                    title="Quick Soup",
                    is_favorite=True,
                    total_time_minutes=25,
                    tags=[dinner_tag],
                ),
                Recipe(
                    user=owner,
                    title="Slow Stew",
                    is_favorite=True,
                    total_time_minutes=90,
                    tags=[dinner_tag],
                ),
                Recipe(
                    user=owner,
                    title="Fast Bread",
                    is_favorite=False,
                    total_time_minutes=15,
                    tags=[side_tag],
                ),
                Recipe(
                    user=other_user,
                    title="Secret Soup",
                    is_favorite=True,
                    total_time_minutes=10,
                    tags=[other_dinner_tag],
                ),
            ]
        )
        session.commit()

        tag_results = list_recipes(session, user_id=owner.id, tag="dinner")
        favorite_results = list_recipes(
            session,
            user_id=owner.id,
            favorite=True,
        )
        nonfavorite_results = list_recipes(
            session,
            user_id=owner.id,
            favorite=False,
        )
        time_results = list_recipes(
            session,
            user_id=owner.id,
            max_total_time=30,
        )
        combined_results = list_recipes(
            session,
            user_id=owner.id,
            tag="dinner",
            favorite=True,
            max_total_time=30,
        )

        assert {recipe.title for recipe in tag_results} == {
            "Quick Soup",
            "Slow Stew",
        }
        assert {recipe.title for recipe in favorite_results} == {
            "Quick Soup",
            "Slow Stew",
        }
        assert [recipe.title for recipe in nonfavorite_results] == ["Fast Bread"]
        assert {recipe.title for recipe in time_results} == {
            "Quick Soup",
            "Fast Bread",
        }
        assert [recipe.title for recipe in combined_results] == ["Quick Soup"]
