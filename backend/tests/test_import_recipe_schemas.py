from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.import_recipe import (
    RecipeImportPreviewRequest,
    RecipeImportPreviewResponse,
)
from app.schemas.recipe import RecipeDraft


def test_import_preview_response_builds_a_successful_draft() -> None:
    response = RecipeImportPreviewResponse(
        import_id=uuid4(),
        status="success",
        parser_used="recipe-scrapers",
        draft={
            "title": "Tomato Soup",
            "source_url": "https://example.com/tomato-soup",
            "source_domain": "example.com",
        },
    )

    assert response.status == "success"
    assert type(response.draft) is RecipeDraft
    assert response.draft.title == "Tomato Soup"
    assert response.warnings == []


def test_import_preview_response_allows_a_blocked_result_without_a_draft() -> None:
    response = RecipeImportPreviewResponse(
        import_id=uuid4(),
        status="blocked",
        draft=None,
        warnings=["This URL is not safe to fetch."],
    )

    assert response.status == "blocked"
    assert response.draft is None
    assert response.warnings == ["This URL is not safe to fetch."]


def test_import_preview_response_identifies_an_existing_duplicate_recipe() -> None:
    existing_recipe_id = uuid4()
    response = RecipeImportPreviewResponse(
        import_id=uuid4(),
        status="duplicate",
        draft=None,
        existing_recipe_id=existing_recipe_id,
        warnings=["This recipe is already in your library."],
        next_actions=["open_existing", "import_as_copy"],
    )

    assert response.existing_recipe_id == existing_recipe_id
    assert response.next_actions == ["open_existing", "import_as_copy"]


def test_import_preview_response_rejects_an_unknown_status() -> None:
    with pytest.raises(ValidationError):
        RecipeImportPreviewResponse(
            import_id=uuid4(),
            status="maybe",
            draft={"title": "Tomato Soup"},
        )


def test_import_preview_request_does_not_import_as_copy_by_default() -> None:
    request = RecipeImportPreviewRequest(
        url="https://example.com/recipe",
    )

    assert request.import_as_copy is False


def test_import_preview_request_allows_explicit_import_as_copy() -> None:
    request = RecipeImportPreviewRequest(
        url="https://example.com/recipe",
        import_as_copy=True,
    )

    assert request.import_as_copy is True
