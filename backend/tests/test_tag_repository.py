import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Base, Recipe, Tag, User
from app.repositories.tag_repository import (
    TagNameConflictError,
    create_tag,
    delete_tag,
    list_tags,
    update_tag,
)
from app.schemas.tag import TagCreate, TagUpdate


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


def test_update_and_delete_tags_are_scoped_and_preserve_recipes() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        dinner_tag = Tag(user=owner, name="Dinner")
        quick_tag = Tag(user=owner, name="Quick")
        other_users_tag = Tag(user=other_user, name="Dinner")
        recipe = Recipe(user=owner, title="Tomato Soup", tags=[dinner_tag])
        session.add_all([recipe, quick_tag, other_users_tag])
        session.commit()

        recipe_id = recipe.id
        dinner_tag_id = dinner_tag.id
        quick_tag_id = quick_tag.id
        other_users_tag_id = other_users_tag.id

        updated_tag = update_tag(
            session,
            user_id=owner.id,
            tag_id=quick_tag_id,
            payload=TagUpdate(name="Lunch"),
        )
        hidden_update = update_tag(
            session,
            user_id=owner.id,
            tag_id=other_users_tag_id,
            payload=TagUpdate(name="Private"),
        )
        with pytest.raises(TagNameConflictError):
            update_tag(
                session,
                user_id=owner.id,
                tag_id=quick_tag_id,
                payload=TagUpdate(name="Dinner"),
            )

        deleted = delete_tag(
            session,
            user_id=owner.id,
            tag_id=dinner_tag_id,
        )
        hidden_delete = delete_tag(
            session,
            user_id=owner.id,
            tag_id=other_users_tag_id,
        )
        session.commit()

        assert updated_tag is not None
        assert updated_tag.name == "Lunch"
        assert hidden_update is None
        assert deleted is True
        assert hidden_delete is False
        assert session.get(Tag, dinner_tag_id) is None
        assert session.get(Tag, other_users_tag_id) is not None
        saved_recipe = session.get(Recipe, recipe_id)
        assert saved_recipe is not None
        assert saved_recipe.tags == []
