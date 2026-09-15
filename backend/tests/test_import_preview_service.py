import asyncio
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from pydantic import HttpUrl
from sqlalchemy.orm import Session

from app.models import Recipe, RecipeImport
from app.schemas.import_recipe import RecipeImportPreviewRequest
from app.schemas.recipe import IngredientDraft, RecipeDraft, RecipeStepDraft
from app.services import import_preview as import_preview_service
from app.services.recipe_importer import RecipeImporter, RecipeImportResult
from app.types import SaveableImportStatus

RECIPE_TITLE = "Tomato Soup"
SOURCE_URL = "https://example.com/recipe"
SOURCE_DOMAIN = "example.com"
DRAFT_SOURCE_URL = "https://draft-example.com/recipe"
DRAFT_SOURCE_DOMAIN = "draft-example.com"
STATUS_DUPLICATE = "duplicate"
STATUS_SUCCESS = "success"
PARSER = "recipe-scrapers"


def test_import_preview_service_creates_duplicate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = Mock(spec=Session)
    current_user_id = uuid4()
    recipe = Recipe(
        id=uuid4(),
        user_id=current_user_id,
        title=RECIPE_TITLE,
        source_url=SOURCE_URL,
    )
    lookup = Mock(return_value=recipe)
    monkeypatch.setattr(import_preview_service, "get_recipe_by_source_url_record", lookup)

    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock()
    import_log = RecipeImport(
        id=uuid4(),
        user_id=current_user_id,
        recipe_id=recipe.id,
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
        parser_used=None,
        status=STATUS_DUPLICATE,
        warnings=[],
        error_message=None,
    )
    create_log = Mock(return_value=import_log)
    monkeypatch.setattr(import_preview_service, "create_import_log", create_log)

    response = asyncio.run(
        import_preview_service.preview_recipe_import(
            session,
            user_id=current_user_id,
            importer=importer,
            payload=RecipeImportPreviewRequest(url=HttpUrl(SOURCE_URL)),
        )
    )

    create_log.assert_called_once_with(
        session=session,
        user_id=current_user_id,
        recipe_id=recipe.id,
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
        parser_used=None,
        status=STATUS_DUPLICATE,
        warnings=["This recipe is already in your library."],
        error_message=None,
    )
    assert response.import_id == import_log.id
    lookup.assert_called_once_with(
        session,
        user_id=current_user_id,
        source_url=SOURCE_URL,
    )
    assert response.status == STATUS_DUPLICATE
    assert response.draft is None
    assert response.existing_recipe_id == recipe.id
    assert response.warnings == ["This recipe is already in your library."]
    assert response.next_actions == ["open_existing", "import_as_copy"]
    importer.preview_from_url.assert_not_awaited()
    session.commit.assert_not_called()
    session.rollback.assert_not_called()


@pytest.mark.parametrize("import_status", ["success", "partial"])
def test_import_preview_service_returns_successful_preview(
    monkeypatch: pytest.MonkeyPatch,
    import_status: SaveableImportStatus,
) -> None:
    session = Mock(spec=Session)
    current_user_id = uuid4()
    warning = "Image was not provided by the source."
    lookup = Mock(return_value=None)
    monkeypatch.setattr(import_preview_service, "get_recipe_by_source_url_record", lookup)
    draft = RecipeDraft(
        title=RECIPE_TITLE,
        source_url=HttpUrl(DRAFT_SOURCE_URL),
        source_domain=DRAFT_SOURCE_DOMAIN,
        ingredients=[IngredientDraft(position=1, original_text="2 cups tomatoes")],
        steps=[RecipeStepDraft(position=1, instruction="Simmer the tomatoes.")],
    )
    import_result = RecipeImportResult(
        status=import_status,
        parser_used=PARSER,
        draft=draft,
        warnings=(warning,),
    )

    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock(return_value=import_result)
    import_log = RecipeImport(
        id=uuid4(),
        user_id=current_user_id,
        source_url=str(draft.source_url),
        source_domain=draft.source_domain,
        parser_used=PARSER,
        status=import_status,
        warnings=[warning],
        error_message=None,
    )
    create_log = Mock(return_value=import_log)
    monkeypatch.setattr(import_preview_service, "create_import_log", create_log)

    response = asyncio.run(
        import_preview_service.preview_recipe_import(
            session,
            user_id=current_user_id,
            importer=importer,
            payload=RecipeImportPreviewRequest(url=HttpUrl(SOURCE_URL)),
        )
    )

    importer.preview_from_url.assert_awaited_once_with(SOURCE_URL)
    create_log.assert_called_once_with(
        session=session,
        user_id=current_user_id,
        source_url=str(draft.source_url),
        source_domain=draft.source_domain,
        parser_used=PARSER,
        status=import_status,
        warnings=[warning],
        error_message=None,
    )
    assert response.import_id == import_log.id
    assert response.draft == draft
    assert response.status == import_status
    assert response.parser_used == PARSER
    assert response.warnings == [warning]
    session.commit.assert_not_called()
    session.rollback.assert_not_called()


def test_import_preview_service_returns_successful_preview_from_copy_import(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = Mock(spec=Session)
    current_user_id = uuid4()
    lookup = Mock(side_effect=AssertionError("Duplicate lookup must be skipped"))
    monkeypatch.setattr(import_preview_service, "get_recipe_by_source_url_record", lookup)
    draft = RecipeDraft(
        title=RECIPE_TITLE,
        source_url=HttpUrl(DRAFT_SOURCE_URL),
        source_domain=DRAFT_SOURCE_DOMAIN,
        ingredients=[IngredientDraft(position=1, original_text="2 cups tomatoes")],
        steps=[RecipeStepDraft(position=1, instruction="Simmer the tomatoes.")],
    )
    import_result = RecipeImportResult(
        status=STATUS_SUCCESS,
        parser_used=PARSER,
        draft=draft,
        warnings=(),
    )

    importer = Mock(spec=RecipeImporter)
    importer.preview_from_url = AsyncMock(return_value=import_result)
    import_log = RecipeImport(
        id=uuid4(),
        user_id=current_user_id,
        source_url=str(draft.source_url),
        source_domain=draft.source_domain,
        parser_used=PARSER,
        status=STATUS_SUCCESS,
        warnings=[],
        error_message=None,
    )
    create_log = Mock(return_value=import_log)
    monkeypatch.setattr(import_preview_service, "create_import_log", create_log)

    response = asyncio.run(
        import_preview_service.preview_recipe_import(
            session,
            user_id=current_user_id,
            importer=importer,
            payload=RecipeImportPreviewRequest(
                url=HttpUrl(SOURCE_URL),
                import_as_copy=True,
            ),
        )
    )

    lookup.assert_not_called()
    importer.preview_from_url.assert_awaited_once_with(SOURCE_URL)
    create_log.assert_called_once_with(
        session=session,
        user_id=current_user_id,
        source_url=str(draft.source_url),
        source_domain=draft.source_domain,
        parser_used=PARSER,
        status=STATUS_SUCCESS,
        warnings=[],
        error_message=None,
    )
    assert response.status == STATUS_SUCCESS
    assert response.draft == draft
    assert response.existing_recipe_id is None
    session.commit.assert_not_called()
    session.rollback.assert_not_called()
