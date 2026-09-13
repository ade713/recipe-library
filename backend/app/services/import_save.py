"""Workflow for saving reviewed recipe imports."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Recipe
from app.repositories.import_repository import get_import_log
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

    raise NotImplementedError
