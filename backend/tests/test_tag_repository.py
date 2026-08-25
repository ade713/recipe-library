from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Base, Tag, User
from app.repositories.tag_repository import create_tag, list_tags
from app.schemas.tag import TagCreate


def test_create_and_list_tags_are_unique_and_scoped_per_user() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(
            email="owner@example.com",
            password_hash="owner-hash",
            tags=[Tag(name="Dinner")],
        )
        other_user = User(
            email="other@example.com",
            password_hash="other-hash",
            tags=[Tag(name="Quick")],
        )
        session.add_all([owner, other_user])
        session.commit()

        created_tag = create_tag(
            session,
            user_id=owner.id,
            payload=TagCreate(name="Quick"),
        )
        assert created_tag is not None
        assert created_tag.id is not None

        duplicate_tag = create_tag(
            session,
            user_id=owner.id,
            payload=TagCreate(name="Dinner"),
        )
        tags = list_tags(session, user_id=owner.id)
        session.commit()

        assert created_tag.user_id == owner.id
        assert duplicate_tag is None
        assert {tag.name for tag in tags} == {"Dinner", "Quick"}
        assert {tag.user_id for tag in tags} == {owner.id}
