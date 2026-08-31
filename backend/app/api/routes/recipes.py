from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Recipe, User
from app.repositories.recipe_repository import create_recipe as create_recipe_record
from app.repositories.recipe_repository import delete_recipe as delete_recipe_record
from app.repositories.recipe_repository import get_recipe as get_recipe_record
from app.repositories.recipe_repository import list_recipes as list_recipe_records
from app.repositories.recipe_repository import update_recipe as update_recipe_record
from app.schemas.recipe import (
    RecipeCreate,
    RecipeListResponse,
    RecipeRead,
    RecipeSort,
    RecipeUpdate,
)

router = APIRouter()


@router.get("")
def list_recipes(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
    favorite: bool | None = None,
    ingredient: str | None = None,
    max_total_time: Annotated[
        int | None,
        Query(ge=0),
    ] = None,
    q: str | None = None,
    sort: RecipeSort = RecipeSort.RECENT,
    tag: str | None = None,
) -> RecipeListResponse:
    recipes = list_recipe_records(
        session,
        user_id=current_user.id,
        favorite=favorite,
        ingredient=ingredient,
        max_total_time=max_total_time,
        q=q,
        sort=sort,
        tag=tag,
    )

    return RecipeListResponse.model_validate({"items": recipes})


@router.post(
    "",
    response_model=RecipeRead,
    status_code=status.HTTP_201_CREATED,
)
def create_recipe(
    current_user: Annotated[User, Depends(get_current_user)],
    payload: RecipeCreate,
    session: Annotated[Session, Depends(get_db)],
) -> Recipe:
    try:
        recipe = create_recipe_record(
            session,
            user_id=current_user.id,
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
    current_user: Annotated[User, Depends(get_current_user)],
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> Recipe:
    recipe = get_recipe_record(
        session,
        user_id=current_user.id,
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
    current_user: Annotated[User, Depends(get_current_user)],
    payload: RecipeUpdate,
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> Recipe:
    try:
        recipe = update_recipe_record(
            session,
            user_id=current_user.id,
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
    current_user: Annotated[User, Depends(get_current_user)],
    recipe_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        is_recipe_deleted = delete_recipe_record(
            session,
            user_id=current_user.id,
            recipe_id=recipe_id,
        )

        if not is_recipe_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipe not found.",
            )

        session.commit()
    except Exception:
        session.rollback()
        raise
