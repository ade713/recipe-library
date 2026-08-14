from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.import_recipe import RecipeImportPreviewResponse
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


def test_import_preview_response_rejects_an_unknown_status() -> None:
    with pytest.raises(ValidationError):
        RecipeImportPreviewResponse(
            import_id=uuid4(),
            status="maybe",
            draft={"title": "Tomato Soup"},
        )
