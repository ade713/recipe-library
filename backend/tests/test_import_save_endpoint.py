from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import create_app
from app.models import Base, Recipe, RecipeImport, User
from app.repositories.import_repository import create_import_log

RECIPE_TITLE = "Edited Tomato Soup"
CURRENT_USER_EMAIL = "current@example.com"
TEST_PASSWORD_HASH = "test-hash"
SOURCE_URL = "https://example.com/recipe"
SOURCE_DOMAIN = "example.com"
PARSER = "recipe-scrapers"


def test_save_import_endpoint_requires_authentication() -> None:
    app = create_app()
    import_id = uuid4()

    with TestClient(app) as client:
        response = client.post(
            f"/api/v1/imports/{import_id}/save",
            json={"title": RECIPE_TITLE},
        )

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_save_import_endpoint_returns_404_for_unknown_import() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        current_user = User(
            email=CURRENT_USER_EMAIL,
            password_hash=TEST_PASSWORD_HASH,
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
    import_id = uuid4()

    try:
        with TestClient(app) as client:
            response = client.post(
                f"/api/v1/imports/{import_id}/save",
                json={"title": RECIPE_TITLE},
                headers={"Authorization": f"Bearer {access_token}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json() == {"detail": "Import not found."}


def test_save_import_endpoint_returns_404_for_another_users_import() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        current_user = User(
            email=CURRENT_USER_EMAIL,
            password_hash=TEST_PASSWORD_HASH,
        )
        other_user = User(
            email="other@example.com",
            password_hash="other-test-hash",
        )
        session.add_all([current_user, other_user])
        session.flush()
        current_user_id = current_user.id
        other_user_id = other_user.id

        other_import_log = create_import_log(
            session,
            user_id=other_user_id,
            source_url="https://example.com/recipe",
            source_domain="example.com",
            status="success",
            parser_used="recipe-scrapers",
            warnings=[],
            error_message=None,
        )
        session.commit()
        other_import_log_id = other_import_log.id

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
                f"/api/v1/imports/{other_import_log_id}/save",
                json={"title": RECIPE_TITLE},
                headers=headers,
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json() == {"detail": "Import not found."}


@pytest.mark.parametrize(
    "import_status",
    ["duplicate", "blocked", "failed"],
)
def test_save_import_endpoint_rejects_unsaveable_import_status(
    import_status: str,
) -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        current_user = User(
            email=CURRENT_USER_EMAIL,
            password_hash=TEST_PASSWORD_HASH,
        )
        session.add(current_user)
        session.commit()
        current_user_id = current_user.id

        import_log = create_import_log(
            session,
            user_id=current_user_id,
            recipe_id=None,
            source_url=SOURCE_URL,
            source_domain=SOURCE_DOMAIN,
            status=import_status,
            parser_used=PARSER,
            warnings=[],
            error_message=None,
        )
        session.commit()
        import_log_id = import_log.id

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
                f"/api/v1/imports/{import_log_id}/save",
                headers=headers,
                json={"title": RECIPE_TITLE},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Import cannot be saved from its current status.",
    }


@pytest.mark.parametrize(
    "import_status",
    ["success", "partial"],
)
def test_save_import_endpoint_creates_saved_recipe(
    import_status: str,
) -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False)

    with testing_session() as session:
        current_user = User(
            email=CURRENT_USER_EMAIL,
            password_hash=TEST_PASSWORD_HASH,
        )
        session.add(current_user)
        session.commit()
        current_user_id = current_user.id

        import_log = create_import_log(
            session,
            user_id=current_user_id,
            recipe_id=None,
            source_url=SOURCE_URL,
            source_domain=SOURCE_DOMAIN,
            status=import_status,
            parser_used=PARSER,
            warnings=[],
            error_message=None,
        )
        session.commit()
        import_log_id = import_log.id

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
                f"/api/v1/imports/{import_log_id}/save",
                headers=headers,
                json={
                    "title": RECIPE_TITLE,
                    "source_url": "https://untrusted.example/changed",
                    "source_domain": "untrusted.example",
                    "ingredients": [
                        {"position": 1, "original_text": "2 cups tomatoes"},
                    ],
                    "steps": [
                        {"position": 1, "instruction": "Simmer the tomatoes."},
                    ],
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert response.json()["title"] == RECIPE_TITLE

    with testing_session() as session:
        saved_recipe = session.scalar(
            select(Recipe).where(Recipe.user_id == current_user_id)
        )
        saved_import = session.get(RecipeImport, import_log_id)

    assert saved_recipe is not None
    assert saved_import is not None
    assert saved_recipe.user_id == current_user_id
    assert saved_recipe.source_url == SOURCE_URL
    assert saved_recipe.source_domain == SOURCE_DOMAIN
    assert saved_recipe.import_status == "imported"
    assert saved_import.recipe_id == saved_recipe.id
