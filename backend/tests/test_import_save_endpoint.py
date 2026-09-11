from dataclasses import dataclass
from unittest.mock import AsyncMock, Mock
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app.api.routes import imports as import_routes
from app.api.routes.imports import get_recipe_importer
from app.core.security import create_access_token
from app.main import create_app
from app.models import Recipe, RecipeImport, User
from app.repositories.import_repository import create_import_log
from app.schemas.recipe import RecipeCreate, RecipeDraft
from app.services.recipe_importer import RecipeImporter, RecipeImportResult

RECIPE_TITLE = "Edited Tomato Soup"
CURRENT_USER_EMAIL = "current@example.com"
TEST_PASSWORD_HASH = "test-hash"
SOURCE_URL = "https://example.com/recipe"
SOURCE_DOMAIN = "example.com"
PARSER = "recipe-scrapers"
STATUS_SUCCESS = "success"
STATUS_IMPORTED = "imported"


@dataclass(frozen=True)
class AuthenticatedTestContext:
    app: FastAPI
    testing_session: sessionmaker[Session]
    current_user_id: UUID
    headers: dict[str, str]


@pytest.fixture
def authenticated_context(
    app: FastAPI,
    testing_session: sessionmaker[Session],
) -> AuthenticatedTestContext:
    with testing_session() as session:
        current_user = User(
            email=CURRENT_USER_EMAIL,
            password_hash=TEST_PASSWORD_HASH,
        )
        session.add(current_user)
        session.commit()
        current_user_id = current_user.id

    access_token = create_access_token(str(current_user_id))
    headers = {"Authorization": f"Bearer {access_token}"}

    context = AuthenticatedTestContext(
        app=app,
        testing_session=testing_session,
        current_user_id=current_user_id,
        headers=headers,
    )
    return context


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


def test_save_import_endpoint_returns_404_for_unknown_import(
    authenticated_context: AuthenticatedTestContext,
) -> None:
    import_id = uuid4()

    with TestClient(authenticated_context.app) as client:
        response = client.post(
            f"/api/v1/imports/{import_id}/save",
            json={"title": RECIPE_TITLE},
            headers=authenticated_context.headers,
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Import not found."}


def test_save_import_endpoint_returns_404_for_another_users_import(
    authenticated_context: AuthenticatedTestContext,
) -> None:
    with authenticated_context.testing_session() as session:
        other_user = User(
            email="other@example.com",
            password_hash="other-test-hash",
        )
        session.add(other_user)
        session.flush()
        other_user_id = other_user.id

        other_import_log = create_import_log(
            session,
            user_id=other_user_id,
            source_url=SOURCE_URL,
            source_domain=SOURCE_DOMAIN,
            status=STATUS_SUCCESS,
            parser_used=PARSER,
            warnings=[],
            error_message=None,
        )
        session.commit()
        other_import_log_id = other_import_log.id

    with TestClient(authenticated_context.app) as client:
        response = client.post(
            f"/api/v1/imports/{other_import_log_id}/save",
            json={"title": RECIPE_TITLE},
            headers=authenticated_context.headers,
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Import not found."}


@pytest.mark.parametrize(
    "import_status",
    ["duplicate", "blocked", "failed"],
)
def test_save_import_endpoint_rejects_unsaveable_import_status(
    authenticated_context: AuthenticatedTestContext,
    import_status: str,
) -> None:
    with authenticated_context.testing_session() as session:
        import_log = create_import_log(
            session,
            user_id=authenticated_context.current_user_id,
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

    with TestClient(authenticated_context.app) as client:
        response = client.post(
            f"/api/v1/imports/{import_log_id}/save",
            headers=authenticated_context.headers,
            json={"title": RECIPE_TITLE},
        )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Import cannot be saved from its current status.",
    }


@pytest.mark.parametrize(
    "import_status",
    ["success", "partial"],
)
def test_save_import_endpoint_creates_saved_recipe(
    authenticated_context: AuthenticatedTestContext,
    import_status: str,
) -> None:
    with authenticated_context.testing_session() as session:
        import_log = create_import_log(
            session,
            user_id=authenticated_context.current_user_id,
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

    with TestClient(authenticated_context.app) as client:
        response = client.post(
            f"/api/v1/imports/{import_log_id}/save",
            headers=authenticated_context.headers,
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

    assert response.status_code == 201
    assert response.json()["title"] == RECIPE_TITLE

    with authenticated_context.testing_session() as session:
        saved_recipe = session.scalar(
            select(Recipe).where(Recipe.user_id == authenticated_context.current_user_id)
        )
        saved_import = session.get(RecipeImport, import_log_id)

    assert saved_recipe is not None
    assert saved_import is not None
    assert saved_recipe.user_id == authenticated_context.current_user_id
    assert saved_recipe.source_url == SOURCE_URL
    assert saved_recipe.source_domain == SOURCE_DOMAIN
    assert saved_recipe.import_status == STATUS_IMPORTED
    assert saved_import.recipe_id == saved_recipe.id


def test_save_import_endpoint_rolls_back_when_linking_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = Mock(spec=Session)
    current_user_id = uuid4()
    import_log_id = uuid4()
    recipe_id = uuid4()

    current_user = User(
        id=current_user_id,
        email=CURRENT_USER_EMAIL,
        password_hash=TEST_PASSWORD_HASH,
    )
    import_log = RecipeImport(
        id=import_log_id,
        user_id=current_user_id,
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
        status="success",
        parser_used=PARSER,
        warnings=[],
    )
    recipe = Recipe(
        id=recipe_id,
        user_id=current_user_id,
        title=RECIPE_TITLE,
        import_status=STATUS_IMPORTED,
    )

    get_import_log_mock = Mock(return_value=import_log)
    create_recipe_mock = Mock(return_value=recipe)

    def fail_to_link_import(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("database link failed")

    monkeypatch.setattr(import_routes, "get_import_log", get_import_log_mock)
    monkeypatch.setattr(import_routes, "create_recipe_record", create_recipe_mock)
    monkeypatch.setattr(
        import_routes,
        "link_import_to_recipe",
        fail_to_link_import,
    )

    with pytest.raises(RuntimeError, match="database link failed"):
        import_routes.save_import(
            import_id=import_log_id,
            session=session,
            current_user=current_user,
            payload=RecipeCreate(title=RECIPE_TITLE),
        )

    session.rollback.assert_called_once_with()
    session.commit.assert_not_called()
    session.refresh.assert_not_called()


def test_save_import_prevents_one_import_log_from_creating_multiple_recipes(
    authenticated_context: AuthenticatedTestContext,
) -> None:
    with authenticated_context.testing_session() as session:
        import_log = create_import_log(
            session,
            user_id=authenticated_context.current_user_id,
            recipe_id=None,
            source_url=SOURCE_URL,
            source_domain=SOURCE_DOMAIN,
            status=STATUS_SUCCESS,
            parser_used=PARSER,
            warnings=[],
            error_message=None,
        )
        session.commit()
        import_log_id = import_log.id

    with TestClient(authenticated_context.app) as client:
        first_response = client.post(
            f"/api/v1/imports/{import_log_id}/save",
            headers=authenticated_context.headers,
            json={
                "title": RECIPE_TITLE,
                "source_url": SOURCE_URL,
                "source_domain": SOURCE_DOMAIN,
                "ingredients": [
                    {"position": 1, "original_text": "2 cups tomatoes"},
                ],
                "steps": [
                    {"position": 1, "instruction": "Simmer the tomatoes."},
                ],
            },
        )
        second_response = client.post(
            f"/api/v1/imports/{import_log_id}/save",
            headers=authenticated_context.headers,
            json={"title": RECIPE_TITLE},
        )

    assert first_response.status_code == status.HTTP_201_CREATED
    assert second_response.status_code == status.HTTP_409_CONFLICT
    assert second_response.json() == {
        "detail": "Import has already been saved.",
    }

    with authenticated_context.testing_session() as session:
        recipe_count = session.scalar(select(func.count()).select_from(Recipe))
        assert recipe_count == 1


def test_import_preview_can_be_edited_and_saved(
    authenticated_context: AuthenticatedTestContext,
) -> None:
    draft = RecipeDraft.model_validate(
        {
            "title": "Original Tomato Soup",
            "source_url": SOURCE_URL,
            "source_domain": SOURCE_DOMAIN,
            "ingredients": [
                {
                    "position": 1,
                    "original_text": "2 cups tomatoes",
                }
            ],
            "steps": [
                {
                    "position": 1,
                    "instruction": "Simmer the tomatoes.",
                }
            ],
        }
    )
    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock(
        return_value=RecipeImportResult(
            status=STATUS_SUCCESS,
            parser_used=PARSER,
            draft=draft,
            warnings=(),
        )
    )

    authenticated_context.app.dependency_overrides[get_recipe_importer] = lambda: importer

    with TestClient(authenticated_context.app) as client:
        preview_response = client.post(
            "/api/v1/imports/preview",
            headers=authenticated_context.headers,
            json={"url": SOURCE_URL},
        )
        assert preview_response.status_code == status.HTTP_200_OK

        preview_body = preview_response.json()

        import_log_id = UUID(preview_body["import_id"])

        edited_draft = preview_body["draft"]
        edited_draft["title"] = RECIPE_TITLE

        save_response = client.post(
            f"/api/v1/imports/{preview_body['import_id']}/save",
            headers=authenticated_context.headers,
            json=edited_draft,
        )

    assert save_response.status_code == status.HTTP_201_CREATED
    assert save_response.json()["title"] == RECIPE_TITLE

    with authenticated_context.testing_session() as session:
        recipe_count = session.scalar(select(func.count()).select_from(Recipe))
        assert recipe_count == 1

        saved_import = session.get(RecipeImport, import_log_id)
        assert saved_import is not None

        recipe = session.scalar(
            select(Recipe).where(Recipe.user_id == authenticated_context.current_user_id)
        )
        assert recipe is not None
        assert recipe.title == RECIPE_TITLE
        assert recipe.source_url == SOURCE_URL
        assert recipe.source_domain == SOURCE_DOMAIN
        assert recipe.import_status == STATUS_IMPORTED
        assert recipe.id == saved_import.recipe_id
