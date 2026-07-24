from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.import_recipe import RecipeImportPreviewRequest

router = APIRouter()


@router.post("/preview", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def preview_import(payload: RecipeImportPreviewRequest) -> None:
    raise HTTPException(status_code=501, detail="Recipe import preview is not implemented yet.")


@router.post("/{import_id}/save", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def save_import(import_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Saving imported recipes is not implemented yet.")


@router.get("/{import_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def get_import(import_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Import lookup is not implemented yet.")
