from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Recipe
from app.repositories.recipe_repository import create_recipe as create_recipe_record
from app.repositories.recipe_repository import delete_recipe as delete_recipe_record
from app.repositories.recipe_repository import get_recipe as get_recipe_record
from app.repositories.recipe_repository import list_recipes as list_recipe_records
from app.repositories.recipe_repository import update_recipe as update_recipe_record
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


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe(
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> Recipe:
    user = get_or_create_dev_user(session)
    recipe = get_recipe_record(
        session,
        user_id=user.id,
        recipe_id=recipe_id,
    )

    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found.",
        )

    return recipe


@router.patch("/{recipe_id}", response_model=RecipeRead)
def update_recipe(
    payload: RecipeUpdate,
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> Recipe:
    try:
        user = get_or_create_dev_user(session)
        recipe = update_recipe_record(
            session,
            user_id=user.id,
            recipe_id=recipe_id,
            payload=payload,
        )

        if recipe is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipe not found.",
            )

        session.commit()
        session.refresh(recipe)
        return recipe
    except Exception:
        session.rollback()
        raise


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        user = get_or_create_dev_user(session)
        recipe_deleted = delete_recipe_record(
            session,
            user_id=user.id,
            recipe_id=recipe_id,
        )

        if not recipe_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipe not found.",
            )

        session.commit()
    except Exception:
        session.rollback()
        raise
