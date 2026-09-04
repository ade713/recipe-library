import asyncio
from unittest.mock import AsyncMock, Mock

from app.schemas.recipe import RecipeDraft
from app.services.recipe_importer import RecipeImporter
from app.services.recipe_normalizer import NormalizedRecipeDraft
from app.services.recipe_parser import ParsedRecipe, RecipeParser
from app.services.safe_fetcher import SafeFetchResult


def test_preview_from_url_fetches_parses_and_normalizes_recipe() -> None:
    submitted_url = "https://example.com/recipe"
    final_url = "https://www.example.com/recipe"
    fetch_result = SafeFetchResult(
        final_url=final_url,
        content_type="text/html",
        html="<html>recipe data</html>",
    )
    parsed_recipe = ParsedRecipe(
        title="Tomato Soup",
        ingredients=("2 cups tomatoes",),
        instructions=("Simmer the tomatoes.",),
        source_url=final_url,
        warnings=(),
        description=None,
        image_url=None,
        author=None,
        site_name=None,
        prep_time_minutes=None,
        cook_time_minutes=None,
        total_time_minutes=None,
        yields_text=None,
    )
    normalized_recipe = NormalizedRecipeDraft(
        draft=RecipeDraft(title="Tomato Soup"),
        warnings=(),
    )
    fetcher = AsyncMock(return_value=fetch_result)
    parser = Mock(spec=RecipeParser)
    parser.parse.return_value = parsed_recipe
    normalizer = Mock(return_value=normalized_recipe)
    importer = RecipeImporter(
        fetcher=fetcher,
        parser=parser,
        normalizer=normalizer,
    )

    result = asyncio.run(importer.preview_from_url(submitted_url))

    assert result == normalized_recipe
    fetcher.assert_awaited_once_with(submitted_url)
    parser.parse.assert_called_once_with(fetch_result.html, final_url)
    normalizer.assert_called_once_with(parsed_recipe)
