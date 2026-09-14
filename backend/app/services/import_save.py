"""Workflow for saving reviewed recipe imports."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Recipe
from app.repositories.import_repository import get_import_log, link_import_to_recipe
from app.repositories.recipe_repository import create_recipe as create_recipe_record
from app.schemas.recipe import RecipeCreate
from app.types import SAVEABLE_IMPORT_STATUSES


class ImportNotFoundError(Exception):
    """The import is missing or not owned by the current user."""


class ImportNotSaveableError(Exception):
    """The import status does not allow saving."""


class ImportAlreadySavedError(Exception):
    """The import is already linked to a recipe."""


def save_reviewed_import(
    session: Session,
    *,
    user_id: UUID,
    import_id: UUID,
    payload: RecipeCreate,
) -> Recipe:
    """Create and link a reviewed recipe without committing."""

    import_log = get_import_log(
        session,
        user_id=user_id,
        import_id=import_id,
    )

    if import_log is None:
        raise ImportNotFoundError

    if import_log.status not in SAVEABLE_IMPORT_STATUSES:
        raise ImportNotSaveableError

    if import_log.recipe_id is not None:
        raise ImportAlreadySavedError

    trusted_payload = RecipeCreate.model_validate(
        {
            **payload.model_dump(),
            "source_url": import_log.source_url,
            "source_domain": import_log.source_domain,
        }
    )

    recipe = create_recipe_record(
        session,
        user_id=user_id,
        import_status="imported",
        payload=trusted_payload,
    )
    link_import_to_recipe(
        session,
        import_log=import_log,
        recipe_id=recipe.id,
    )

    return recipe
