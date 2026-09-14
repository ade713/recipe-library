import asyncio
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from pydantic import HttpUrl
from sqlalchemy.orm import Session

from app.models import Recipe, RecipeImport
from app.schemas.import_recipe import RecipeImportPreviewRequest
from app.services import import_preview as import_preview_service
from app.services.recipe_importer import RecipeImporter

RECIPE_TITLE = "Tomato Soup"
SOURCE_URL = "https://example.com/recipe"
STATUS_DUPLICATE = "duplicate"


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
        source_domain="example.com",
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

    assert response.import_id == import_log.id
    lookup.assert_called_once_with(
        session,
        user_id=current_user_id,
        source_url=SOURCE_URL,
    )
    assert response.status == STATUS_DUPLICATE
    assert response.draft is None
    assert response.existing_recipe_id == recipe.id
    assert response.next_actions == ["open_existing", "import_as_copy"]
    importer.preview_from_url.assert_not_awaited()
    session.commit.assert_not_called()
    session.rollback.assert_not_called()
