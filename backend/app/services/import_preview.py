from typing import Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories.import_repository import create_import_log
from app.repositories.recipe_repository import (
    get_recipe_by_source_url as get_recipe_by_source_url_record,
)
from app.schemas.import_recipe import (
    RecipeImportPreviewRequest,
    RecipeImportPreviewResponse,
)
from app.services.recipe_importer import RecipeImporter
from app.services.url_validator import extract_domain


async def preview_recipe_import(
    session: Session,
    *,
    user_id: UUID,
    importer: RecipeImporter,
    payload: RecipeImportPreviewRequest,
) -> RecipeImportPreviewResponse:
    """Build and log an import preview without committing."""

    submitted_url = str(payload.url)
    existing_recipe = None
    if not payload.import_as_copy:
        existing_recipe = get_recipe_by_source_url_record(
            session,
            user_id=user_id,
            source_url=submitted_url,
        )

    if existing_recipe is not None:
        log_status: Literal["duplicate"] = "duplicate"
        warnings = ["This recipe is already in your library."]

        duplicate_import_log = create_import_log(
            session=session,
            user_id=user_id,
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

        return response

    raise NotImplementedError
