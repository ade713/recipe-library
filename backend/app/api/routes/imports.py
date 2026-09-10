from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Recipe, User
from app.repositories.import_repository import (
    create_import_log,
    get_import_log,
    link_import_to_recipe,
)
from app.repositories.recipe_repository import (
    create_recipe as create_recipe_record,
)
from app.repositories.recipe_repository import (
    get_recipe_by_source_url as get_recipe_by_source_url_record,
)
from app.schemas.import_recipe import (
    RecipeImportPreviewRequest,
    RecipeImportPreviewResponse,
)
from app.schemas.recipe import RecipeCreate, RecipeRead
from app.services.recipe_importer import (
    RecipeImportBlockedError,
    RecipeImporter,
    RecipeImportFailedError,
)
from app.services.url_validator import extract_domain

router = APIRouter()

SAVEABLE_IMPORT_STATUSES = frozenset({"success", "partial"})


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
                next_actions=["enter_manually", "open_source_url"],
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


@router.post(
    "/{import_id}/save",
    response_model=RecipeRead,
    status_code=status.HTTP_201_CREATED,
)
def save_import(
    import_id: UUID,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    payload: RecipeCreate,
) -> Recipe:
    """Save a reviewed draft for the current user's import.

    Preserve the source URL and domain from the import log.
    Link the saved recipe to that log.
    Return 404 when the import is missing or belongs to another user.
    Return 409 when its status is not saveable or it is already linked to a recipe.
    """
    import_log = get_import_log(
        session,
        user_id=current_user.id,
        import_id=import_id,
    )

    if import_log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found.",
        )

    if import_log.status not in SAVEABLE_IMPORT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Import cannot be saved from its current status.",
        )

    if import_log.recipe_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Import has already been saved.",
        )

    trusted_payload = RecipeCreate.model_validate(
        {
            **payload.model_dump(),
            "source_url": import_log.source_url,
            "source_domain": import_log.source_domain,
        }
    )

    try:
        recipe = create_recipe_record(
            session,
            user_id=current_user.id,
            import_status="imported",
            payload=trusted_payload,
        )
        link_import_to_recipe(
            session,
            import_log=import_log,
            recipe_id=recipe.id,
        )

        session.commit()
        session.refresh(recipe)
        return recipe
    except Exception:
        session.rollback()
        raise
