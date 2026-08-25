from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Tag
from app.schemas.tag import TagCreate


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
