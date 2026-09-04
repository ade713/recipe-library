from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import User
from app.repositories.import_repository import create_import_log
from app.schemas.import_recipe import (
    RecipeImportPreviewRequest,
    RecipeImportPreviewResponse,
)
from app.services.recipe_importer import RecipeImporter

router = APIRouter()


def get_recipe_importer() -> RecipeImporter:
    return RecipeImporter()


@router.post("/preview", response_model=RecipeImportPreviewResponse)
async def preview_import(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    importer: Annotated[RecipeImporter, Depends(get_recipe_importer)],
    payload: RecipeImportPreviewRequest,
) -> RecipeImportPreviewResponse:
    try:
        result = await importer.preview_from_url(str(payload.url))
        import_log = create_import_log(
            session=session,
            user_id=current_user.id,
            source_url=str(result.draft.source_url or payload.url),
            source_domain=result.draft.source_domain,
            status=result.status,
            parser_used=result.parser_used,
            warnings=list(result.warnings),
            error_message=None,
        )
        response = RecipeImportPreviewResponse(
            import_id=import_log.id,
            status=result.status,
            parser_used=result.parser_used,
            draft=result.draft,
            warnings=list(result.warnings),
        )

        session.commit()

        return response
    except Exception:
        session.rollback()
        raise


@router.post("/{import_id}/save", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def save_import(import_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Saving imported recipes is not implemented yet.")


@router.get("/{import_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def get_import(import_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Import lookup is not implemented yet.")
