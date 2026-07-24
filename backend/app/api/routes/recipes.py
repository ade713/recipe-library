from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.recipe import RecipeCreate, RecipeUpdate

router = APIRouter()


@router.get("")
def list_recipes(
    q: str | None = None,
    tag: str | None = None,
    favorite: bool | None = None,
    max_total_time: int | None = Query(default=None, ge=1),
    ingredient: str | None = None,
    sort: str = "recent",
) -> dict[str, list[dict]]:
    # Temporary placeholder so the mobile UI can be planned before DB work.
    return {"items": []}


@router.post("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def create_recipe(payload: RecipeCreate) -> None:
    raise HTTPException(status_code=501, detail="Recipe creation is not implemented yet.")


@router.get("/{recipe_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def get_recipe(recipe_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Recipe detail is not implemented yet.")


@router.patch("/{recipe_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def update_recipe(recipe_id: UUID, payload: RecipeUpdate) -> None:
    raise HTTPException(status_code=501, detail="Recipe update is not implemented yet.")


@router.delete("/{recipe_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def delete_recipe(recipe_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Recipe deletion is not implemented yet.")
