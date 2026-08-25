from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Tag
from app.schemas.tag import TagCreate, TagUpdate


class TagNameConflictError(ValueError):
    """Raised when a user already has another tag with the requested name."""


def create_tag(
    session: Session,
    *,
    user_id: UUID,
    payload: TagCreate,
) -> Tag | None:
    existing_tag = session.scalar(
        select(Tag).where(
            Tag.user_id == user_id,
            Tag.name == payload.name,
        )
    )

    if existing_tag is not None:
        return None

    tag = Tag(name=payload.name, user_id=user_id)
    session.add(tag)
    session.flush()
    return tag


def list_tags(
    session: Session,
    *,
    user_id: UUID,
) -> list[Tag]:
    statement = (
        select(Tag)
        .where(Tag.user_id == user_id)
        .order_by(Tag.name.asc())
    )

    return list(session.scalars(statement))


def update_tag(
    session: Session,
    *,
    user_id: UUID,
    tag_id: UUID,
    payload: TagUpdate,
) -> Tag | None:
    tag = _get_tag(
        session,
        user_id=user_id,
        tag_id=tag_id,
    )

    if tag is None:
        return None

    other_tag = session.scalar(
        select(Tag).where(
            Tag.user_id == user_id,
            Tag.name == payload.name,
            Tag.id != tag_id,
        )
    )

    if other_tag is not None:
        raise TagNameConflictError("Tag name already exists.")

    tag.name = payload.name

    session.flush()
    return tag


def delete_tag(
    session: Session,
    *,
    tag_id: UUID,
    user_id: UUID,
) -> bool:
    tag = _get_tag(
        session,
        tag_id=tag_id,
        user_id=user_id,
    )

    if tag is None:
        return False

    session.delete(tag)
    session.flush()
    return True


def _get_tag(
    session: Session,
    *,
    user_id: UUID,
    tag_id: UUID,
) -> Tag | None:
    return session.scalar(
        select(Tag).where(
            Tag.id == tag_id,
            Tag.user_id == user_id,
        )
    )
