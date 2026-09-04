import asyncio
from unittest.mock import AsyncMock, Mock

import pytest

from app.schemas.recipe import RecipeDraft
from app.services.recipe_importer import (
    RecipeImportBlockedError,
    RecipeImportFailedError,
    RecipeImporter,
)
from app.services.recipe_normalizer import NormalizedRecipeDraft
from app.services.recipe_parser import ParsedRecipe, RecipeParseError, RecipeParser
from app.services.safe_fetcher import (
    FetchTimeoutError,
    SafeFetchResult,
    UnsafeUrlError,
)


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


def test_preview_from_url_translates_unsafe_url_into_blocked_error() -> None:
    fetch_error = UnsafeUrlError("URL resolves to a non-public address.")
    fetcher = AsyncMock(side_effect=fetch_error)
    parser = Mock(spec=RecipeParser)
    normalizer = Mock()
    importer = RecipeImporter(
        fetcher=fetcher,
        parser=parser,
        normalizer=normalizer,
    )

    with pytest.raises(
        RecipeImportBlockedError,
        match="Recipe URL was blocked by safety checks.",
    ) as error_info:
        asyncio.run(importer.preview_from_url("http://localhost/recipe"))

    assert error_info.value.__cause__ is fetch_error
    parser.parse.assert_not_called()
    normalizer.assert_not_called()


def test_preview_from_url_translates_fetch_failure_into_failed_error() -> None:
    fetch_error = FetchTimeoutError("Fetching the recipe page timed out.")
    fetcher = AsyncMock(side_effect=fetch_error)
    parser = Mock(spec=RecipeParser)
    normalizer = Mock()
    importer = RecipeImporter(
        fetcher=fetcher,
        parser=parser,
        normalizer=normalizer,
    )

    with pytest.raises(
        RecipeImportFailedError,
        match="Recipe page could not be fetched.",
    ) as error_info:
        asyncio.run(importer.preview_from_url("https://example.com/recipe"))

    assert error_info.value.__cause__ is fetch_error
    parser.parse.assert_not_called()
    normalizer.assert_not_called()


def test_preview_from_url_translates_parser_failure_into_failed_error() -> None:
    fetch_result = SafeFetchResult(
        final_url="https://example.com/recipe",
        content_type="text/html",
        html="<html>not a recipe</html>",
    )
    parse_error = RecipeParseError("Recipe data was not found.")
    fetcher = AsyncMock(return_value=fetch_result)
    parser = Mock(spec=RecipeParser)
    parser.parse.side_effect = parse_error
    normalizer = Mock()
    importer = RecipeImporter(
        fetcher=fetcher,
        parser=parser,
        normalizer=normalizer,
    )

    with pytest.raises(
        RecipeImportFailedError,
        match="Recipe data could not be parsed.",
    ) as error_info:
        asyncio.run(importer.preview_from_url(fetch_result.final_url))

    assert error_info.value.__cause__ is parse_error
    normalizer.assert_not_called()
