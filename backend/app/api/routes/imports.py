from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Recipe, User
from app.schemas.import_recipe import (
    RecipeImportPreviewRequest,
    RecipeImportPreviewResponse,
)
from app.schemas.recipe import RecipeCreate, RecipeRead
from app.services.import_preview import preview_recipe_import
from app.services.import_save import (
    ImportAlreadySavedError,
    ImportNotFoundError,
    ImportNotSaveableError,
    save_reviewed_import,
)
from app.services.recipe_importer import RecipeImporter

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
        response = await preview_recipe_import(
            session,
            user_id=current_user.id,
            importer=importer,
            payload=payload,
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

    try:
        recipe = save_reviewed_import(
            session,
            user_id=current_user.id,
            import_id=import_id,
            payload=payload,
        )
        session.commit()
        session.refresh(recipe)
        return recipe
    except ImportNotFoundError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found.",
        ) from error
    except ImportNotSaveableError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Import cannot be saved from its current status.",
        ) from error
    except ImportAlreadySavedError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Import has already been saved.",
        ) from error
    except Exception:
        session.rollback()
        raise
