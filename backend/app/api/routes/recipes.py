from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Recipe
from app.repositories.recipe_repository import create_recipe as create_recipe_record
from app.repositories.recipe_repository import list_recipes as list_recipe_records
from app.repositories.user_repository import get_or_create_dev_user
from app.schemas.recipe import (
    RecipeCreate,
    RecipeListResponse,
    RecipeRead,
    RecipeUpdate,
)

router = APIRouter()


@router.get("")
def list_recipes(
    session: Annotated[Session, Depends(get_db)],
) -> RecipeListResponse:
    user = get_or_create_dev_user(session)
    recipes = list_recipe_records(session, user_id=user.id)

    return RecipeListResponse.model_validate({"items": recipes})


@router.post(
    "",
    response_model=RecipeRead,
    status_code=status.HTTP_201_CREATED,
)
def create_recipe(
    payload: RecipeCreate,
    session: Annotated[Session, Depends(get_db)],
) -> Recipe:
    try:
        user = get_or_create_dev_user(session)
        recipe = create_recipe_record(
            session,
            user_id=user.id,
            payload=payload,
        )
        session.commit()
        session.refresh(recipe)
        return recipe
    except Exception:
        session.rollback()
        raise


@router.get("/{recipe_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def get_recipe(recipe_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Recipe detail is not implemented yet.")


@router.patch("/{recipe_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def update_recipe(recipe_id: UUID, payload: RecipeUpdate) -> None:
    raise HTTPException(status_code=501, detail="Recipe update is not implemented yet.")


@router.delete("/{recipe_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def delete_recipe(recipe_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Recipe deletion is not implemented yet.")
