from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.tag import TagCreate, TagUpdate

router = APIRouter()


@router.get("")
def list_tags() -> dict[str, list[dict]]:
    return {"items": []}


@router.post("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def create_tag(payload: TagCreate) -> None:
    raise HTTPException(status_code=501, detail="Creating tags is not implemented yet.")


@router.patch("/{tag_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def update_tag(tag_id: UUID, payload: TagUpdate) -> None:
    raise HTTPException(status_code=501, detail="Updating tags is not implemented yet.")


@router.delete("/{tag_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def delete_tag(tag_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Deleting tags is not implemented yet.")
