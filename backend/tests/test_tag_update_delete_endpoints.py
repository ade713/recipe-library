from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.models import Recipe, Tag, User


def test_tag_update_and_delete_endpoints_mutate_owned_tags_and_preserve_recipes(
    app: FastAPI,
    auth_headers: dict[str, str],
    current_user_id: UUID,
    testing_session: sessionmaker[Session],
) -> None:
    with testing_session() as session:
        dinner_tag = Tag(user_id=current_user_id, name="Dinner")
        quick_tag = Tag(user_id=current_user_id, name="Quick")
        recipe = Recipe(user_id=current_user_id, title="Tomato Soup", tags=[dinner_tag])
        session.add_all([recipe, quick_tag])
        session.commit()
        recipe_id = recipe.id
        dinner_tag_id = dinner_tag.id
        quick_tag_id = quick_tag.id

    with TestClient(app) as client:
        update_response = client.patch(
            f"/api/v1/tags/{quick_tag_id}",
            headers=auth_headers,
            json={"name": "Lunch"},
        )
        conflict_response = client.patch(
            f"/api/v1/tags/{quick_tag_id}",
            headers=auth_headers,
            json={"name": "Dinner"},
        )
        delete_response = client.delete(
            f"/api/v1/tags/{dinner_tag_id}",
            headers=auth_headers,
        )

    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Lunch"
    assert conflict_response.status_code == 409
    assert conflict_response.json() == {"detail": "Tag already exists."}
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    with testing_session() as session:
        updated_tag = session.get(Tag, quick_tag_id)
        assert updated_tag is not None
        assert updated_tag.name == "Lunch"
        assert session.get(Tag, dinner_tag_id) is None
        saved_recipe = session.get(Recipe, recipe_id)
        assert saved_recipe is not None
        assert saved_recipe.tags == []


def test_tag_update_and_delete_endpoints_hide_another_users_tags(
    app: FastAPI,
    auth_headers: dict[str, str],
    testing_session: sessionmaker[Session],
) -> None:
    with testing_session() as session:
        other_user = User(email="other@example.com", password_hash="other-password-hash")
        other_tag = Tag(user=other_user, name="Private")
        session.add(other_tag)
        session.commit()
        other_tag_id = other_tag.id

    with TestClient(app) as client:
        update_response = client.patch(
            f"/api/v1/tags/{other_tag_id}",
            headers=auth_headers,
            json={"name": "Stolen"},
        )
        delete_response = client.delete(
            f"/api/v1/tags/{other_tag_id}",
            headers=auth_headers,
        )

    assert update_response.status_code == 404
    assert update_response.json() == {"detail": "Tag not found."}
    assert delete_response.status_code == 404
    assert delete_response.json() == {"detail": "Tag not found."}

    with testing_session() as session:
        private_tag = session.get(Tag, other_tag_id)
        assert private_tag is not None
        assert private_tag.name == "Private"
