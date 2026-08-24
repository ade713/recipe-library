from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RecipeNote
from app.repositories.recipe_repository import get_recipe
from app.schemas.note import NoteCreate, NoteUpdate


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


def update_note(
    session: Session,
    *,
    user_id: UUID,
    recipe_id: UUID,
    note_id: UUID,
    payload: NoteUpdate,
) -> RecipeNote | None:
    note = _get_note(
        session,
        user_id=user_id,
        recipe_id=recipe_id,
        note_id=note_id,
    )

    if note is None:
        return None

    note.note = payload.note
    session.flush()

    return note


def delete_note(
    session: Session,
    *,
    user_id: UUID,
    recipe_id: UUID,
    note_id: UUID,
) -> bool:
    note = _get_note(
        session,
        user_id=user_id,
        recipe_id=recipe_id,
        note_id=note_id,
    )

    if note is None:
        return False

    session.delete(note)
    session.flush()

    return True


def _get_note(
    session: Session,
    *,
    user_id: UUID,
    recipe_id: UUID,
    note_id: UUID,
) -> RecipeNote | None:
    statement = select(RecipeNote).where(
        RecipeNote.id == note_id,
        RecipeNote.recipe_id == recipe_id,
        RecipeNote.user_id == user_id,
    )

    return session.scalar(statement)
