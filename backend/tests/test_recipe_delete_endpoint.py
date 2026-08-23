from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import create_app
from app.models import Base, Recipe, User
from app.repositories.user_repository import DEV_USER_EMAIL


def test_delete_recipe_endpoint_removes_owned_recipe() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        user = User(email=DEV_USER_EMAIL, password_hash="dev-password-hash")
        recipe = Recipe(user=user, title="Tomato Soup")
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
            response = client.delete(f"/api/v1/recipes/{recipe_id}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 204
    assert response.content == b""

    with testing_session() as session:
        assert session.get(Recipe, recipe_id) is None


def test_delete_recipe_endpoint_hides_another_users_recipe() -> None:
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
            response = client.delete(f"/api/v1/recipes/{other_recipe_id}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json() == {"detail": "Recipe not found."}

    with testing_session() as session:
        assert session.get(Recipe, other_recipe_id) is not None
