from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, selectinload

from app.models import Base, Recipe, RecipeIngredient, RecipeStep, RecipeTip, Tag, User
from app.repositories.recipe_repository import (
    create_recipe,
    get_recipe,
    list_recipes,
    update_recipe,
)
from app.schemas.recipe import RecipeCreate, RecipeUpdate


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


def test_list_recipes_returns_only_owned_recipes() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        owners_recipe = Recipe(user=owner, title="Tomato Soup")
        other_recipe = Recipe(user=other_user, title="Secret Cake")
        session.add_all([owners_recipe, other_recipe])
        session.commit()

        recipes = list_recipes(session, user_id=owner.id)

        assert [recipe.id for recipe in recipes] == [owners_recipe.id]
        assert [recipe.title for recipe in recipes] == ["Tomato Soup"]


def test_get_recipe_returns_owned_detail_and_hides_other_users_recipe() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        owners_recipe = Recipe(
            user=owner,
            title="Tomato Soup",
            ingredients=[RecipeIngredient(position=1, original_text="2 cups tomatoes")],
            steps=[RecipeStep(position=1, instruction="Simmer the tomatoes.")],
            tips=[RecipeTip(position=1, tip="Finish with basil.")],
            tags=[Tag(user=owner, name="Dinner")],
        )
        other_recipe = Recipe(user=other_user, title="Secret Cake")
        session.add_all([owners_recipe, other_recipe])
        session.commit()
        owner_id = owner.id
        owners_recipe_id = owners_recipe.id
        other_recipe_id = other_recipe.id

    with Session(engine) as session:
        recipe = get_recipe(
            session,
            user_id=owner_id,
            recipe_id=owners_recipe_id,
        )
        hidden_recipe = get_recipe(
            session,
            user_id=owner_id,
            recipe_id=other_recipe_id,
        )

    assert recipe is not None
    assert recipe.title == "Tomato Soup"
    assert recipe.ingredients[0].original_text == "2 cups tomatoes"
    assert recipe.steps[0].instruction == "Simmer the tomatoes."
    assert recipe.tips[0].tip == "Finish with basil."
    assert recipe.tags[0].name == "Dinner"
    assert hidden_recipe is None


def test_update_recipe_applies_supplied_fields_only_for_owner() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        recipe = Recipe(
            user=owner,
            title="Tomato Soup",
            description="Original description",
            ingredients=[RecipeIngredient(position=1, original_text="2 cups tomatoes")],
            steps=[RecipeStep(position=1, instruction="Simmer the tomatoes.")],
            tips=[RecipeTip(position=1, tip="Keep this tip.")],
            tags=[Tag(user=owner, name="Dinner")],
        )
        other_recipe = Recipe(user=other_user, title="Secret Cake")
        other_users_tag = Tag(user=other_user, name="Quick")
        session.add_all([recipe, other_recipe, other_users_tag])
        session.commit()

        payload = RecipeUpdate(
            description=None,
            ingredients=[{"position": 1, "original_text": "3 cups tomatoes"}],
            steps=[],
            tags=["Quick"],
        )

        updated_recipe = update_recipe(
            session,
            user_id=owner.id,
            recipe_id=recipe.id,
            payload=payload,
        )
        hidden_recipe = update_recipe(
            session,
            user_id=owner.id,
            recipe_id=other_recipe.id,
            payload=RecipeUpdate(title="Stolen Cake"),
        )
        session.commit()

        assert updated_recipe is not None
        assert updated_recipe.title == "Tomato Soup"
        assert updated_recipe.description is None
        assert [item.original_text for item in updated_recipe.ingredients] == [
            "3 cups tomatoes"
        ]
        assert updated_recipe.steps == []
        assert [tip.tip for tip in updated_recipe.tips] == ["Keep this tip."]
        assert [tag.name for tag in updated_recipe.tags] == ["Quick"]
        assert {tag.user_id for tag in updated_recipe.tags} == {owner.id}
        assert hidden_recipe is None
        assert other_recipe.title == "Secret Cake"
