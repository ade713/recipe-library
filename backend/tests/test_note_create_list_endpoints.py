from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import create_app
from app.models import Base, Recipe, RecipeNote, User
from app.repositories.user_repository import DEV_USER_EMAIL


def test_note_create_and_list_endpoints_use_owned_recipe() -> None:
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
            notes=[RecipeNote(user=user, note="Use less salt.")],
        )
        session.add(recipe)
        session.commit()
        recipe_id = recipe.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            create_response = client.post(
                f"/api/v1/recipes/{recipe_id}/notes",
                json={"note": "Add more basil."},
            )
            list_response = client.get(f"/api/v1/recipes/{recipe_id}/notes")
    finally:
        app.dependency_overrides.clear()

    assert create_response.status_code == 201
    assert create_response.json()["note"] == "Add more basil."
    assert list_response.status_code == 200
    assert {item["note"] for item in list_response.json()} == {
        "Use less salt.",
        "Add more basil.",
    }

    with testing_session() as session:
        saved_notes = list(
            session.scalars(
                select(RecipeNote).where(RecipeNote.recipe_id == recipe_id)
            )
        )
        assert {note.note for note in saved_notes} == {
            "Use less salt.",
            "Add more basil.",
        }


def test_note_create_and_list_endpoints_hide_another_users_recipe() -> None:
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
        other_recipe = Recipe(user=other_user, title="Secret Cake")
        session.add(other_recipe)
        session.commit()
        other_recipe_id = other_recipe.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            create_response = client.post(
                f"/api/v1/recipes/{other_recipe_id}/notes",
                json={"note": "This must not be saved."},
            )
            list_response = client.get(
                f"/api/v1/recipes/{other_recipe_id}/notes"
            )
    finally:
        app.dependency_overrides.clear()

    assert create_response.status_code == 404
    assert create_response.json() == {"detail": "Recipe not found."}
    assert list_response.status_code == 404
    assert list_response.json() == {"detail": "Recipe not found."}

    with testing_session() as session:
        assert session.scalar(
            select(RecipeNote).where(RecipeNote.note == "This must not be saved.")
        ) is None
