from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Tag, User
from app.repositories.tag_repository import TagNameConflictError
from app.repositories.tag_repository import create_tag as create_tag_record
from app.repositories.tag_repository import delete_tag as delete_tag_record
from app.repositories.tag_repository import list_tags as list_tag_records
from app.repositories.tag_repository import update_tag as update_tag_record
from app.schemas.tag import TagCreate, TagListResponse, TagResponse, TagUpdate

router = APIRouter()


@router.get("", response_model=TagListResponse)
def list_tags(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> TagListResponse:
    tags = list_tag_records(session, user_id=current_user.id)
    return TagListResponse.model_validate({"items": tags})


@router.post(
    "",
    response_model=TagResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_tag(
    current_user: Annotated[User, Depends(get_current_user)],
    payload: TagCreate,
    session: Annotated[Session, Depends(get_db)],
) -> Tag:
    try:
        tag = create_tag_record(
            session,
            user_id=current_user.id,
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
    current_user: Annotated[User, Depends(get_current_user)],
    tag_id: UUID,
    payload: TagUpdate,
    session: Annotated[Session, Depends(get_db)],
) -> Tag:
    try:
        tag = update_tag_record(
            session,
            user_id=current_user.id,
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
    current_user: Annotated[User, Depends(get_current_user)],
    tag_id: UUID,
    session: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        is_tag_deleted = delete_tag_record(
            session,
            tag_id=tag_id,
            user_id=current_user.id,
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
