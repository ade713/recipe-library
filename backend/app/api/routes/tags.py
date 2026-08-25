from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Tag
from app.repositories.tag_repository import TagNameConflictError
from app.repositories.tag_repository import create_tag as create_tag_record
from app.repositories.tag_repository import delete_tag as delete_tag_record
from app.repositories.tag_repository import list_tags as list_tag_records
from app.repositories.tag_repository import update_tag as update_tag_record
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


@router.patch("/{tag_id}", response_model=TagResponse)
def update_tag(
    tag_id: UUID,
    payload: TagUpdate,
    session: Annotated[Session, Depends(get_db)],
) -> Tag:
    try:
        user = get_or_create_dev_user(session)
        tag = update_tag_record(
            session,
            user_id=user.id,
            tag_id=tag_id,
            payload=payload,
        )

        if tag is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found.",
            )

        session.commit()
        session.refresh(tag)
        return tag
    except TagNameConflictError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tag already exists.",
        ) from error
    except Exception:
        session.rollback()
        raise


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        user = get_or_create_dev_user(session)
        is_tag_deleted = delete_tag_record(
            session,
            tag_id=tag_id,
            user_id=user.id,
        )

        if not is_tag_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found.",
            )

        session.commit()
    except Exception:
        session.rollback()
        raise
