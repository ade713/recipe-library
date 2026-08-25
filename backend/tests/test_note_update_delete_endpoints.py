from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import create_app
from app.models import Base, Recipe, RecipeNote, User
from app.repositories.user_repository import DEV_USER_EMAIL


def test_note_update_and_delete_endpoints_mutate_owned_notes() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        user = User(email=DEV_USER_EMAIL, password_hash="dev-password-hash")
        recipe = Recipe(
            user=user,
            title="Tomato Soup",
            notes=[
                RecipeNote(user=user, note="Original note."),
                RecipeNote(user=user, note="Delete this note."),
            ],
        )
        session.add(recipe)
        session.commit()
        recipe_id = recipe.id
        note_to_update_id = recipe.notes[0].id
        note_to_delete_id = recipe.notes[1].id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            update_response = client.patch(
                f"/api/v1/recipes/{recipe_id}/notes/{note_to_update_id}",
                json={"note": "Updated note."},
            )
            delete_response = client.delete(
                f"/api/v1/recipes/{recipe_id}/notes/{note_to_delete_id}"
            )
    finally:
        app.dependency_overrides.clear()

    assert update_response.status_code == 200
    assert update_response.json()["note"] == "Updated note."
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    with testing_session() as session:
        updated_note = session.get(RecipeNote, note_to_update_id)
        assert updated_note is not None
        assert updated_note.note == "Updated note."
        assert session.get(RecipeNote, note_to_delete_id) is None


def test_note_update_and_delete_endpoints_hide_another_users_notes() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        session.add(User(email=DEV_USER_EMAIL, password_hash="dev-password-hash"))
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

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            update_response = client.patch(
                f"/api/v1/recipes/{other_recipe_id}/notes/{private_note_id}",
                json={"note": "Stolen note."},
            )
            delete_response = client.delete(
                f"/api/v1/recipes/{other_recipe_id}/notes/{private_note_id}"
            )
    finally:
        app.dependency_overrides.clear()

    assert update_response.status_code == 404
    assert update_response.json() == {"detail": "Note not found."}
    assert delete_response.status_code == 404
    assert delete_response.json() == {"detail": "Note not found."}

    with testing_session() as session:
        private_note = session.get(RecipeNote, private_note_id)
        assert private_note is not None
        assert private_note.note == "Private note."
