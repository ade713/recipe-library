from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import RecipeNote, User
from app.repositories.note_repository import create_note as create_note_record
from app.repositories.note_repository import delete_note as delete_note_record
from app.repositories.note_repository import list_notes as list_note_records
from app.repositories.note_repository import update_note as update_note_record
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate

router = APIRouter()


@router.get("", response_model=list[NoteResponse])
def list_notes(
    current_user: Annotated[User, Depends(get_current_user)],
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> list[RecipeNote]:
    notes = list_note_records(
        session,
        user_id=current_user.id,
        recipe_id=recipe_id,
    )

    if notes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found.",
        )

    return notes


@router.post(
    "",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_note(
    current_user: Annotated[User, Depends(get_current_user)],
    payload: NoteCreate,
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> RecipeNote:
    try:
        note = create_note_record(
            session,
            user_id=current_user.id,
            recipe_id=recipe_id,
            payload=payload,
        )

        if note is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipe not found.",
            )

        session.commit()
        session.refresh(note)
        return note
    except Exception:
        session.rollback()
        raise


@router.patch("/{note_id}", response_model=NoteResponse)
def update_note(
    current_user: Annotated[User, Depends(get_current_user)],
    note_id: UUID,
    payload: NoteUpdate,
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> RecipeNote:
    try:
        note = update_note_record(
            session,
            user_id=current_user.id,
            recipe_id=recipe_id,
            note_id=note_id,
            payload=payload,
        )

        if note is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found.",
            )

        session.commit()
        session.refresh(note)
        return note
    except Exception:
        session.rollback()
        raise


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    current_user: Annotated[User, Depends(get_current_user)],
    note_id: UUID,
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        is_note_deleted = delete_note_record(
            session,
            user_id=current_user.id,
            recipe_id=recipe_id,
            note_id=note_id,
        )

        if not is_note_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found.",
            )

        session.commit()
    except Exception:
        session.rollback()
        raise
