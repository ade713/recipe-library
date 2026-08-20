from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, selectinload

from app.models import Base, Recipe, Tag, User
from app.repositories.recipe_repository import create_recipe
from app.schemas.recipe import RecipeCreate


def test_create_recipe_saves_nested_records_for_owner() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(email="cook@example.com", password_hash="not-a-real-hash")
        session.add(user)
        session.commit()

        payload = RecipeCreate(
            title="Tomato Soup",
            source_url="https://example.com/tomato-soup",
            source_domain="example.com",
            ingredients=[
                {"position": 1, "original_text": "2 cups tomatoes"},
            ],
            steps=[
                {"position": 1, "instruction": "Simmer the tomatoes."},
            ],
            tips=[
                {"position": 1, "tip": "Finish with fresh basil."},
            ],
        )

        recipe = create_recipe(session, user_id=user.id, payload=payload)
        session.commit()
        recipe_id = recipe.id
        owner_id = user.id

    with Session(engine) as session:
        saved_recipe = session.scalar(
            select(Recipe)
            .where(Recipe.id == recipe_id)
            .options(
                selectinload(Recipe.ingredients),
                selectinload(Recipe.steps),
                selectinload(Recipe.tips),
            )
        )

        assert saved_recipe is not None
        assert saved_recipe.user_id == owner_id
        assert saved_recipe.title == "Tomato Soup"
        assert saved_recipe.source_url == "https://example.com/tomato-soup"
        assert saved_recipe.ingredients[0].original_text == "2 cups tomatoes"
        assert saved_recipe.steps[0].instruction == "Simmer the tomatoes."
        assert saved_recipe.tips[0].tip == "Finish with fresh basil."


def test_create_recipe_reuses_tags_only_for_same_owner() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        existing_tag = Tag(user=owner, name="Dinner")
        other_users_tag = Tag(user=other_user, name="Quick")
        session.add_all([existing_tag, other_users_tag])
        session.commit()

        existing_tag_id = existing_tag.id
        other_users_tag_id = other_users_tag.id

        payload = RecipeCreate(
            title="Tomato Soup",
            tags=["Dinner", "Quick"],
        )

        recipe = create_recipe(session, user_id=owner.id, payload=payload)
        session.commit()

        assert {tag.name for tag in recipe.tags} == {"Dinner", "Quick"}
        assert {tag.user_id for tag in recipe.tags} == {owner.id}
        assert existing_tag_id in {tag.id for tag in recipe.tags}
        assert other_users_tag_id not in {tag.id for tag in recipe.tags}
