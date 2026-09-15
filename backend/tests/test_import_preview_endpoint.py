import asyncio
from collections.abc import Generator
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import HttpUrl
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import imports as import_routes
from app.api.routes.imports import get_recipe_importer
from app.core.database import get_db
from app.core.security import create_access_token
from app.main import create_app
from app.models import Base, Recipe, RecipeImport, User
from app.schemas.import_recipe import RecipeImportPreviewRequest
from app.schemas.recipe import IngredientDraft, RecipeDraft, RecipeStepDraft
from app.services import import_preview as import_preview_service
from app.services.recipe_importer import (
    RecipeImportBlockedError,
    RecipeImporter,
    RecipeImportFailedError,
    RecipeImportResult,
)

CURRENT_USER_EMAIL = "current@example.com"
TEST_PASSWORD_HASH = "test-hash"
RECIPE_TITLE = "Tomato Soup"
SOURCE_URL = "https://example.com/recipe"
SOURCE_DOMAIN = "example.com"
STATUS_SUCCESS = "success"
PARSER = "recipe-scrapers"
PREVIEW_ENDPOINT = "/api/v1/imports/preview"
INGREDIENT_TEXT = "2 cups tomatoes"
STEP_INSTRUCTION = "Simmer the tomatoes."
MISSING_IMAGE_WARNING = "Image was not provided by the source."


def test_import_preview_endpoint_requires_authentication() -> None:
    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            PREVIEW_ENDPOINT,
            json={"url": SOURCE_URL},
        )

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_import_preview_endpoint_returns_and_logs_successful_draft() -> None:
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

    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock(
        return_value=RecipeImportResult(
            status=STATUS_SUCCESS,
            parser_used=PARSER,
            draft=RecipeDraft(
                title=RECIPE_TITLE,
                source_url=HttpUrl("https://www.example.com/recipe"),
                source_domain="www.example.com",
                ingredients=[IngredientDraft(position=1, original_text=INGREDIENT_TEXT)],
                steps=[RecipeStepDraft(position=1, instruction=STEP_INSTRUCTION)],
            ),
            warnings=(MISSING_IMAGE_WARNING,),
        )
    )

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_recipe_importer] = lambda: importer
    access_token = create_access_token(str(current_user_id))

    try:
        with TestClient(app) as client:
            response = client.post(
                PREVIEW_ENDPOINT,
                headers={"Authorization": f"Bearer {access_token}"},
                json={"url": SOURCE_URL},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["parser_used"] == PARSER
    assert body["draft"]["title"] == RECIPE_TITLE
    assert body["warnings"] == [MISSING_IMAGE_WARNING]
    assert body["import_id"] is not None
    importer.preview_from_url.assert_awaited_once_with(SOURCE_URL)

    with testing_session() as session:
        import_log = session.scalar(select(RecipeImport))
        assert import_log is not None
        assert import_log.id.hex == body["import_id"].replace("-", "")
        assert import_log.user_id == current_user_id
        assert import_log.source_url == "https://www.example.com/recipe"
        assert import_log.status == "success"
        assert import_log.warnings == [MISSING_IMAGE_WARNING]


def test_import_preview_endpoint_returns_duplicate_before_importing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = Mock(spec=Session)
    current_user = User(
        id=uuid4(),
        email=CURRENT_USER_EMAIL,
        password_hash=TEST_PASSWORD_HASH,
    )
    existing_recipe = Recipe(
        id=uuid4(),
        user_id=current_user.id,
        title=RECIPE_TITLE,
        source_url=SOURCE_URL,
    )
    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock()
    import_log = RecipeImport(
        id=uuid4(),
        user_id=current_user.id,
        recipe_id=existing_recipe.id,
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
        parser_used=None,
        status="duplicate",
        warnings=["This recipe is already in your library."],
        error_message=None,
    )
    find_recipe = Mock(return_value=existing_recipe)
    create_log = Mock(return_value=import_log)
    monkeypatch.setattr(
        import_preview_service,
        "get_recipe_by_source_url_record",
        find_recipe,
    )
    monkeypatch.setattr(import_preview_service, "create_import_log", create_log)

    response = asyncio.run(
        import_routes.preview_import(
            session=session,
            current_user=current_user,
            importer=importer,
            payload=RecipeImportPreviewRequest(url=HttpUrl(SOURCE_URL)),
        )
    )

    assert response.status == "duplicate"
    assert response.draft is None
    assert response.existing_recipe_id == existing_recipe.id
    assert response.next_actions == ["open_existing", "import_as_copy"]
    find_recipe.assert_called_once_with(
        session,
        user_id=current_user.id,
        source_url=SOURCE_URL,
    )
    create_log.assert_called_once_with(
        session=session,
        user_id=current_user.id,
        recipe_id=existing_recipe.id,
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
        status="duplicate",
        parser_used=None,
        warnings=["This recipe is already in your library."],
        error_message=None,
    )
    importer.preview_from_url.assert_not_awaited()
    session.commit.assert_called_once_with()
    session.rollback.assert_not_called()


def test_import_preview_endpoint_can_import_duplicate_as_copy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = Mock(spec=Session)
    current_user = User(
        id=uuid4(),
        email=CURRENT_USER_EMAIL,
        password_hash=TEST_PASSWORD_HASH,
    )
    existing_recipe = Recipe(
        id=uuid4(),
        user_id=current_user.id,
        title="Existing Tomato Soup",
        source_url=SOURCE_URL,
    )
    result = RecipeImportResult(
        status=STATUS_SUCCESS,
        parser_used=PARSER,
        draft=RecipeDraft(
            title="Imported Tomato Soup Copy",
            source_url=HttpUrl(SOURCE_URL),
            source_domain=SOURCE_DOMAIN,
            ingredients=[IngredientDraft(position=1, original_text=INGREDIENT_TEXT)],
            steps=[RecipeStepDraft(position=1, instruction=STEP_INSTRUCTION)],
        ),
        warnings=(),
    )
    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock(return_value=result)
    import_log = RecipeImport(
        id=uuid4(),
        user_id=current_user.id,
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
        parser_used=PARSER,
        status=STATUS_SUCCESS,
        warnings=[],
        error_message=None,
    )
    find_recipe = Mock(return_value=existing_recipe)
    create_log = Mock(return_value=import_log)
    monkeypatch.setattr(
        import_preview_service,
        "get_recipe_by_source_url_record",
        find_recipe,
    )
    monkeypatch.setattr(import_preview_service, "create_import_log", create_log)

    response = asyncio.run(
        import_routes.preview_import(
            session=session,
            current_user=current_user,
            importer=importer,
            payload=RecipeImportPreviewRequest(
                url=HttpUrl(SOURCE_URL),
                import_as_copy=True,
            ),
        )
    )

    assert response.status == "success"
    assert response.draft is not None
    assert response.draft.title == "Imported Tomato Soup Copy"
    assert response.existing_recipe_id is None
    assert response.next_actions == []
    find_recipe.assert_not_called()
    importer.preview_from_url.assert_awaited_once_with(SOURCE_URL)
    create_log.assert_called_once()
    session.commit.assert_called_once_with()
    session.rollback.assert_not_called()


@pytest.mark.parametrize(
    ("import_error", "expected_status"),
    [
        (
            RecipeImportBlockedError("Recipe URL was blocked by safety checks."),
            "blocked",
        ),
        (
            RecipeImportFailedError("Recipe page could not be fetched."),
            "failed",
        ),
    ],
)
def test_import_preview_endpoint_logs_expected_import_errors(
    monkeypatch: pytest.MonkeyPatch,
    import_error: Exception,
    expected_status: str,
) -> None:
    session = Mock(spec=Session)
    current_user = User(
        id=uuid4(),
        email=CURRENT_USER_EMAIL,
        password_hash=TEST_PASSWORD_HASH,
    )
    find_recipe = Mock(return_value=None)
    monkeypatch.setattr(
        import_preview_service,
        "get_recipe_by_source_url_record",
        find_recipe,
    )
    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock(side_effect=import_error)
    import_log = RecipeImport(
        id=uuid4(),
        user_id=current_user.id,
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
        parser_used=None,
        status=expected_status,
        warnings=[str(import_error)],
        error_message=str(import_error),
    )
    create_log = Mock(return_value=import_log)
    monkeypatch.setattr(import_preview_service, "create_import_log", create_log)

    response = asyncio.run(
        import_routes.preview_import(
            session=session,
            current_user=current_user,
            importer=importer,
            payload=RecipeImportPreviewRequest(
                url=HttpUrl(SOURCE_URL),
            ),
        )
    )

    assert response.status == expected_status
    assert response.parser_used is None
    assert response.draft is None
    assert response.warnings == [str(import_error)]
    assert response.next_actions == [
        "enter_manually",
        "open_source_url",
    ]

    create_log.assert_called_once_with(
        session=session,
        user_id=current_user.id,
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
        status=expected_status,
        parser_used=None,
        warnings=[str(import_error)],
        error_message=str(import_error),
    )
    session.commit.assert_called_once_with()
    session.rollback.assert_not_called()


def test_import_preview_endpoint_rolls_back_unexpected_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = Mock(spec=Session)
    current_user = User(
        id=uuid4(),
        email=CURRENT_USER_EMAIL,
        password_hash=TEST_PASSWORD_HASH,
    )
    find_recipe = Mock(return_value=None)
    monkeypatch.setattr(
        import_preview_service,
        "get_recipe_by_source_url_record",
        find_recipe,
    )
    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock(side_effect=RuntimeError("unexpected import failure"))
    create_log = Mock()
    monkeypatch.setattr(import_preview_service, "create_import_log", create_log)

    with pytest.raises(RuntimeError, match="unexpected import failure"):
        asyncio.run(
            import_routes.preview_import(
                session=session,
                current_user=current_user,
                importer=importer,
                payload=RecipeImportPreviewRequest(url=HttpUrl(SOURCE_URL)),
            )
        )

    create_log.assert_not_called()
    session.commit.assert_not_called()
    session.rollback.assert_called_once_with()


def test_import_preview_endpoint_rolls_back_duplicate_lookup_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = Mock(spec=Session)
    current_user = User(
        id=uuid4(),
        email=CURRENT_USER_EMAIL,
        password_hash=TEST_PASSWORD_HASH,
    )

    find_recipe = Mock(side_effect=RuntimeError("duplicate lookup failed"))
    monkeypatch.setattr(import_preview_service, "get_recipe_by_source_url_record", find_recipe)

    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock()

    create_log = Mock()
    monkeypatch.setattr(import_preview_service, "create_import_log", create_log)

    with pytest.raises(RuntimeError, match="duplicate lookup failed"):
        asyncio.run(
            import_routes.preview_import(
                session=session,
                current_user=current_user,
                importer=importer,
                payload=RecipeImportPreviewRequest(url=HttpUrl(SOURCE_URL)),
            )
        )

    importer.preview_from_url.assert_not_awaited()
    create_log.assert_not_called()
    session.commit.assert_not_called()
    session.rollback.assert_called_once_with()
