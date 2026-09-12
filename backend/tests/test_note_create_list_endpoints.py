from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models import Recipe, RecipeNote, User


def test_note_create_and_list_endpoints_use_owned_recipe(
    app: FastAPI,
    auth_headers: dict[str, str],
    current_user_id: UUID,
    testing_session: sessionmaker[Session],
) -> None:
    with testing_session() as session:
        recipe = Recipe(
            user_id=current_user_id,
            title="Tomato Soup",
            notes=[RecipeNote(user_id=current_user_id, note="Use less salt.")],
        )
        session.add(recipe)
        session.commit()
        recipe_id = recipe.id

    with TestClient(app) as client:
        create_response = client.post(
            f"/api/v1/recipes/{recipe_id}/notes",
            headers=auth_headers,
            json={"note": "Add more basil."},
        )
        list_response = client.get(
            f"/api/v1/recipes/{recipe_id}/notes",
            headers=auth_headers,
        )

    assert create_response.status_code == 201
    assert create_response.json()["note"] == "Add more basil."
    assert list_response.status_code == 200
    assert {item["note"] for item in list_response.json()} == {
        "Use less salt.",
        "Add more basil.",
    }

    with testing_session() as session:
        saved_notes = list(
            session.scalars(select(RecipeNote).where(RecipeNote.recipe_id == recipe_id))
        )
        assert {note.note for note in saved_notes} == {
            "Use less salt.",
            "Add more basil.",
        }


def test_note_create_and_list_endpoints_hide_another_users_recipe(
    app: FastAPI,
    auth_headers: dict[str, str],
    testing_session: sessionmaker[Session],
) -> None:
    with testing_session() as session:
        other_user = User(email="other@example.com", password_hash="other-password-hash")
        other_recipe = Recipe(user=other_user, title="Secret Cake")
        session.add(other_recipe)
        session.commit()
        other_recipe_id = other_recipe.id

    with TestClient(app) as client:
        create_response = client.post(
            f"/api/v1/recipes/{other_recipe_id}/notes",
            headers=auth_headers,
            json={"note": "This must not be saved."},
        )
        list_response = client.get(
            f"/api/v1/recipes/{other_recipe_id}/notes",
            headers=auth_headers,
        )

    assert create_response.status_code == 404
    assert create_response.json() == {"detail": "Recipe not found."}
    assert list_response.status_code == 404
    assert list_response.json() == {"detail": "Recipe not found."}

    with testing_session() as session:
        assert (
            session.scalar(select(RecipeNote).where(RecipeNote.note == "This must not be saved."))
            is None
        )
