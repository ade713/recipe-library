from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RecipeNote
from app.repositories.recipe_repository import get_recipe
from app.schemas.note import NoteCreate


def create_note(
    session: Session,
    *,
    user_id: UUID,
    recipe_id: UUID,
    payload: NoteCreate,
) -> RecipeNote | None:
    recipe = get_recipe(
        session,
        user_id=user_id,
        recipe_id=recipe_id,
    )

    if recipe is None:
        return None

    note = RecipeNote(recipe=recipe, user_id=user_id, note=payload.note)
    session.add(note)
    session.flush()
    return note


def list_notes(
    session: Session,
    *,
    user_id: UUID,
    recipe_id: UUID,
) -> list[RecipeNote] | None:
    recipe = get_recipe(
        session,
        user_id=user_id,
        recipe_id=recipe_id,
    )

    if recipe is None:
        return None

    statement = (
        select(RecipeNote)
        .where(RecipeNote.user_id == recipe.user_id, RecipeNote.recipe_id == recipe.id)
    )

    return list(session.scalars(statement))
