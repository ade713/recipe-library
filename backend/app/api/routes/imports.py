from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import User
from app.repositories.import_repository import create_import_log
from app.repositories.recipe_repository import (
    get_recipe_by_source_url as get_recipe_by_source_url_record,
)
from app.schemas.import_recipe import (
    RecipeImportPreviewRequest,
    RecipeImportPreviewResponse,
)
from app.services.recipe_importer import (
    RecipeImportBlockedError,
    RecipeImporter,
    RecipeImportFailedError,
)
from app.services.url_validator import extract_domain

router = APIRouter()


def get_recipe_importer() -> RecipeImporter:
    """Create the importer used to build recipe previews."""
    return RecipeImporter()


@router.post("/preview", response_model=RecipeImportPreviewResponse)
async def preview_import(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    importer: Annotated[RecipeImporter, Depends(get_recipe_importer)],
    payload: RecipeImportPreviewRequest,
) -> RecipeImportPreviewResponse:
    """Create and log an authenticated recipe-import preview.

    Successful and partial imports return an editable draft. Blocked and
    failed imports return no draft but are still logged for the current user.
    Duplicates are returned before network fetching.
    Explicit copy requests bypass duplicate detection.
    """
    try:
        submitted_url = str(payload.url)

        existing_recipe = None
        if not payload.import_as_copy:
            existing_recipe = get_recipe_by_source_url_record(
                session,
                user_id=current_user.id,
                source_url=submitted_url,
            )

        if existing_recipe is not None:
            log_status: Literal["duplicate"] = "duplicate"
            warnings = ["This recipe is already in your library."]

            duplicate_import_log = create_import_log(
                session=session,
                user_id=current_user.id,
                recipe_id=existing_recipe.id,
                source_url=submitted_url,
                source_domain=extract_domain(submitted_url),
                parser_used=None,
                status=log_status,
                warnings=warnings,
                error_message=None,
            )
            response = RecipeImportPreviewResponse(
                import_id=duplicate_import_log.id,
                status=log_status,
                parser_used=None,
                draft=None,
                warnings=warnings,
                existing_recipe_id=existing_recipe.id,
                next_actions=["open_existing", "import_as_copy"],
            )

            session.commit()
            return response

        try:
            result = await importer.preview_from_url(submitted_url)
        except (RecipeImportBlockedError, RecipeImportFailedError) as error:
            failure_status: Literal["blocked", "failed"] = (
                "blocked"
                if isinstance(error, RecipeImportBlockedError)
                else "failed"
            )
            warnings = [str(error)]

            import_failure_log = create_import_log(
                session=session,
                user_id=current_user.id,
                source_url=submitted_url,
                source_domain=extract_domain(submitted_url),
                status=failure_status,
                parser_used=None,
                warnings=warnings,
                error_message=str(error),
            )
            response = RecipeImportPreviewResponse(
                import_id=import_failure_log.id,
                status=failure_status,
                parser_used=None,
                draft=None,
                warnings=warnings,
            )
        else:
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
