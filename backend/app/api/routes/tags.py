from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Tag
from app.repositories.tag_repository import create_tag as create_tag_record
from app.repositories.tag_repository import list_tags as list_tag_records
from app.repositories.user_repository import get_or_create_dev_user
from app.schemas.tag import TagCreate, TagListResponse, TagResponse, TagUpdate

router = APIRouter()


@router.get("", response_model=TagListResponse)
def list_tags(
    session: Annotated[Session, Depends(get_db)],
) -> TagListResponse:
    user = get_or_create_dev_user(session)
    tags = list_tag_records(session, user_id=user.id)

    return TagListResponse.model_validate({"items": tags})


@router.post(
    "",
    response_model=TagResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_tag(
    payload: TagCreate,
    session: Annotated[Session, Depends(get_db)],
) -> Tag:
    try:
        user = get_or_create_dev_user(session)
        tag = create_tag_record(
            session,
            user_id=user.id,
            payload=payload,
        )

        if tag is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tag already exists.",
            )

        session.commit()
        session.refresh(tag)
        return tag
    except Exception:
        session.rollback()
        raise


@router.patch("/{tag_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def update_tag(tag_id: UUID, payload: TagUpdate) -> None:
    raise HTTPException(status_code=501, detail="Updating tags is not implemented yet.")


@router.delete("/{tag_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def delete_tag(tag_id: UUID) -> None:
    raise HTTPException(status_code=501, detail="Deleting tags is not implemented yet.")
