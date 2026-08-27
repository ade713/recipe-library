from collections.abc import Generator
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import recipes as recipe_routes
from app.core.database import get_db
from app.core.security import create_access_token
from app.main import create_app
from app.models import Base, Recipe, User
from app.schemas.recipe import RecipeCreate


def test_create_recipe_endpoint_saves_and_returns_recipe() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        current_user = User(
            email="current@example.com",
            password_hash="test-hash",
        )
        session.add(current_user)
        session.commit()
        current_user_id = current_user.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    access_token = create_access_token(str(current_user_id))
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/recipes",
                headers=headers,
                json={
                    "title": "Tomato Soup",
                    "ingredients": [{"position": 1, "original_text": "2 cups tomatoes"}],
                    "steps": [{"position": 1, "instruction": "Simmer the tomatoes."}],
                    "tips": [{"position": 1, "tip": "Finish with fresh basil."}],
                    "tags": ["Dinner"],
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Tomato Soup"
    assert body["ingredients"][0]["original_text"] == "2 cups tomatoes"
    assert body["steps"][0]["instruction"] == "Simmer the tomatoes."
    assert body["tips"][0]["tip"] == "Finish with fresh basil."
    assert body["tags"] == ["Dinner"]

    with testing_session() as session:
        saved_recipe = session.scalar(select(Recipe))
        assert saved_recipe is not None
        assert saved_recipe.title == "Tomato Soup"


def test_create_recipe_endpoint_rejects_invalid_payload_before_db_work() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        current_user = User(
            email="current@example.com",
            password_hash="test-hash",
        )
        session.add(current_user)
        session.commit()
        current_user_id = current_user.id

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    access_token = create_access_token(str(current_user_id))
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/recipes",
                headers=headers,
                json={"title": ""},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422

    with testing_session() as session:
        recipe_count = session.scalar(select(func.count()).select_from(Recipe))
        user_count = session.scalar(select(func.count()).select_from(User))

        assert recipe_count == 0
        assert user_count == 1


def test_create_recipe_endpoint_rolls_back_when_repository_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = Mock(spec=Session)
    user = User(
        id=uuid4(),
        email="current@example.com",
        password_hash="test-hash",
    )

    def fail_to_create_recipe(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("database write failed")

    monkeypatch.setattr(
        recipe_routes,
        "create_recipe_record",
        fail_to_create_recipe,
    )

    with pytest.raises(RuntimeError, match="database write failed"):
        recipe_routes.create_recipe(
            current_user=user,
            payload=RecipeCreate(title="Tomato Soup"),
            session=session,
        )

    session.rollback.assert_called_once_with()
    session.commit.assert_not_called()
