from typing import cast
from unittest.mock import Mock

from app.services.recipe_parser import RecipeParser, ScraperFactory


def test_recipe_parser_extracts_core_fields_without_fetching_online() -> None:
    scraper = Mock()
    scraper.title.return_value = "Tomato Soup"
    scraper.ingredients.return_value = [
        "2 cans tomatoes",
        "1 cup vegetable stock",
    ]
    scraper.instructions_list.return_value = [
        "Combine the ingredients.",
        "Simmer for 20 minutes.",
    ]
    scraper_factory = Mock(return_value=scraper)
    parser = RecipeParser(
        scraper_factory=cast(ScraperFactory, scraper_factory),
    )

    result = parser.parse(
        html="<html>recipe data</html>",
        source_url="https://example.com/tomato-soup",
    )

    scraper_factory.assert_called_once_with(
        "<html>recipe data</html>",
        "https://example.com/tomato-soup",
        online=False,
        supported_only=False,
    )
    assert result.title == "Tomato Soup"
    assert result.ingredients == (
        "2 cans tomatoes",
        "1 cup vegetable stock",
    )
    assert result.instructions == (
        "Combine the ingredients.",
        "Simmer for 20 minutes.",
    )
