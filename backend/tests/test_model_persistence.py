import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Base, Recipe, User


def test_recipe_can_be_saved_and_queried_by_owner() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(email="cook@example.com", password_hash="not-a-real-hash")
        recipe = Recipe(user=user, title="Tomato Soup")
        session.add(recipe)
        session.commit()

        statement = select(Recipe).where(
            Recipe.id == recipe.id,
            Recipe.user_id == user.id,
        )
        saved_recipe = session.scalar(statement)

        assert saved_recipe is not None
        assert saved_recipe.title == "Tomato Soup"
        assert saved_recipe.user_id == user.id


def test_session_can_continue_after_rollback() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        first_user = User(email="cook@example.com", password_hash="first-hash")
        session.add(first_user)
        session.commit()

        duplicate_user = User(email="cook@example.com", password_hash="second-hash")
        session.add(duplicate_user)

        with pytest.raises(IntegrityError):
            session.commit()

        session.rollback()

        saved_user = session.scalar(
            select(User).where(User.email == "cook@example.com")
        )

        assert saved_user is not None
        assert saved_user.password_hash == "first-hash"
