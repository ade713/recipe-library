"""Database access for recipes.
Keep API route handlers thin by moving recipe queries here.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Recipe, RecipeIngredient, RecipeStep, RecipeTip, Tag
from app.schemas.recipe import RecipeCreate, RecipeUpdate


def create_recipe(
    session: Session,
    *,
    user_id: UUID,
    payload: RecipeCreate,
) -> Recipe:
    recipe_data = payload.model_dump(
        exclude={"ingredients", "steps", "tips", "tags"},
        mode="json",
    )

    recipe = Recipe(user_id=user_id, **recipe_data)

    recipe_ingredients = [
        RecipeIngredient(**ingredient.model_dump(mode="json")) for ingredient in payload.ingredients
    ]
    recipe_steps = [RecipeStep(**step.model_dump(mode="json")) for step in payload.steps]
    recipe_tips = [RecipeTip(**tip.model_dump(mode="json")) for tip in payload.tips]

    recipe.ingredients = recipe_ingredients
    recipe.steps = recipe_steps
    recipe.tips = recipe_tips
    recipe.tags = _resolve_tags(
        session,
        user_id=user_id,
        tag_names=payload.tags,
    )

    session.add(recipe)
    session.flush()

    return recipe


def get_recipe(session: Session, *, user_id: UUID, recipe_id: UUID) -> Recipe | None:
    statement = (
        select(Recipe)
        .where(
            Recipe.id == recipe_id,
            Recipe.user_id == user_id,
        )
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.steps),
            selectinload(Recipe.tips),
            selectinload(Recipe.tags),
        )
    )

    return session.scalar(statement)


def list_recipes(session: Session, *, user_id: UUID) -> list[Recipe]:
    statement = (
        select(Recipe)
        .where(Recipe.user_id == user_id)
        .options(selectinload(Recipe.tags))
        .order_by(Recipe.created_at.desc())
    )

    return list(session.scalars(statement))


def update_recipe(
    session: Session,
    *,
    user_id: UUID,
    recipe_id: UUID,
    payload: RecipeUpdate,
) -> Recipe | None:
    recipe = get_recipe(
        session,
        user_id=user_id,
        recipe_id=recipe_id,
    )

    if recipe is None:
        return None

    scalar_data = payload.model_dump(
        exclude_unset=True,
        exclude={"ingredients", "steps", "tips", "tags"},
        mode="json",
    )

    for field_name, value in scalar_data.items():
        setattr(recipe, field_name, value)

    supplied_fields = payload.model_fields_set

    if "ingredients" in supplied_fields:
        recipe.ingredients = [
            RecipeIngredient(**ingredient.model_dump(mode="json"))
            for ingredient in (payload.ingredients or [])
        ]

    if "steps" in supplied_fields:
        recipe.steps = [
            RecipeStep(**step.model_dump(mode="json"))
            for step in (payload.steps or [])
        ]

    if "tips" in supplied_fields:
        recipe.tips = [
            RecipeTip(**tip.model_dump(mode="json"))
            for tip in (payload.tips or [])
        ]

    if "tags" in supplied_fields:
        recipe.tags = _resolve_tags(
            session,
            user_id=user_id,
            tag_names=payload.tags or []
        )

    session.flush()

    return recipe


def delete_recipe(session: Session, *, user_id: UUID, recipe_id: UUID) -> bool:
    recipe = get_recipe(
        session,
        user_id=user_id,
        recipe_id=recipe_id,
    )

    if recipe is None:
        return False

    session.delete(recipe)
    session.flush()

    return True


def _resolve_tags(session: Session, *, user_id: UUID, tag_names: list[str]) -> list[Tag]:
    tags: list[Tag] = []

    for tag_name in dict.fromkeys(tag_names):
        tag = session.scalar(
            select(Tag).where(
                Tag.user_id == user_id,
                Tag.name == tag_name,
            )
        )

        if tag is None:
            tag = Tag(user_id=user_id, name=tag_name)

        tags.append(tag)

    return tags
