"""Database access for recipes.
Keep API route handlers thin by moving recipe queries here.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Recipe, RecipeIngredient, RecipeStep, RecipeTip, Tag
from app.schemas.recipe import RecipeCreate


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

    recipe_tags: list[Tag] = []
    for tag_name in dict.fromkeys(payload.tags):
        tag = session.scalar(
            select(Tag).where(
                Tag.user_id == user_id,
                Tag.name == tag_name,
            )
        )

        if tag is None:
            tag = Tag(user_id=user_id, name=tag_name)

        recipe_tags.append(tag)

    recipe.tags = recipe_tags

    session.add(recipe)
    session.flush()

    return recipe


def list_recipes(session: Session, *, user_id: UUID) -> list[Recipe]:
    statement = (
        select(Recipe)
        .where(Recipe.user_id == user_id)
        .options(selectinload(Recipe.tags))
        .order_by(Recipe.created_at.desc())
    )

    return list(session.scalars(statement))
