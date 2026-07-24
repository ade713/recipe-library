from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.note import NoteCreate, NoteUpdate

router = APIRouter()


@router.get("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def list_notes(recipe_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Listing notes is not implemented yet.")


@router.post("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def create_note(recipe_id: UUID, payload: NoteCreate) -> None:
    raise HTTPException(status_code=501, detail="Creating notes is not implemented yet.")


@router.patch("/{note_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def update_note(recipe_id: UUID, note_id: UUID, payload: NoteUpdate) -> None:
    raise HTTPException(status_code=501, detail="Updating notes is not implemented yet.")


@router.delete("/{note_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def delete_note(recipe_id: UUID, note_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Deleting notes is not implemented yet.")
