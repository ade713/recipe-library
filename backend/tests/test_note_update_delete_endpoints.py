from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.models import Recipe, RecipeNote, User


def test_note_update_and_delete_endpoints_mutate_owned_notes(
    app: FastAPI,
    auth_headers: dict[str, str],
    current_user_id: UUID,
    testing_session: sessionmaker[Session],
) -> None:
    with testing_session() as session:
        recipe = Recipe(
            user_id=current_user_id,
            title="Tomato Soup",
            notes=[
                RecipeNote(user_id=current_user_id, note="Original note."),
                RecipeNote(user_id=current_user_id, note="Delete this note."),
            ],
        )
        session.add(recipe)
        session.commit()
        recipe_id = recipe.id
        note_to_update_id = recipe.notes[0].id
        note_to_delete_id = recipe.notes[1].id

    with TestClient(app) as client:
        update_response = client.patch(
            f"/api/v1/recipes/{recipe_id}/notes/{note_to_update_id}",
            headers=auth_headers,
            json={"note": "Updated note."},
        )
        delete_response = client.delete(
            f"/api/v1/recipes/{recipe_id}/notes/{note_to_delete_id}",
            headers=auth_headers,
        )

    assert update_response.status_code == 200
    assert update_response.json()["note"] == "Updated note."
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    with testing_session() as session:
        updated_note = session.get(RecipeNote, note_to_update_id)
        assert updated_note is not None
        assert updated_note.note == "Updated note."
        assert session.get(RecipeNote, note_to_delete_id) is None


def test_note_update_and_delete_endpoints_hide_another_users_notes(
    app: FastAPI,
    auth_headers: dict[str, str],
    testing_session: sessionmaker[Session],
) -> None:
    with testing_session() as session:
        other_user = User(email="other@example.com", password_hash="other-password-hash")
        other_recipe = Recipe(
            user=other_user,
            title="Secret Cake",
            notes=[RecipeNote(user=other_user, note="Private note.")],
        )
        session.add(other_recipe)
        session.commit()
        other_recipe_id = other_recipe.id
        private_note_id = other_recipe.notes[0].id

    with TestClient(app) as client:
        update_response = client.patch(
            f"/api/v1/recipes/{other_recipe_id}/notes/{private_note_id}",
            headers=auth_headers,
            json={"note": "Stolen note."},
        )
        delete_response = client.delete(
            f"/api/v1/recipes/{other_recipe_id}/notes/{private_note_id}",
            headers=auth_headers,
        )

    assert update_response.status_code == 404
    assert update_response.json() == {"detail": "Note not found."}
    assert delete_response.status_code == 404
    assert delete_response.json() == {"detail": "Note not found."}

    with testing_session() as session:
        private_note = session.get(RecipeNote, private_note_id)
        assert private_note is not None
        assert private_note.note == "Private note."
