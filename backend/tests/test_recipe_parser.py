from typing import cast
from unittest.mock import Mock

import pytest
from recipe_scrapers import (
    ElementNotFoundInHtml,
    FieldNotProvidedByWebsiteException,
    NoSchemaFoundInWildMode,
    RecipeSchemaNotFound,
    WebsiteNotImplementedError,
)

from app.services.recipe_parser import (
    RecipeParseError,
    RecipeParser,
    ScraperFactory,
)


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
    scraper.description.return_value = None
    scraper.image.return_value = None
    scraper.author.return_value = None
    scraper.site_name.return_value = None
    scraper.prep_time.return_value = None
    scraper.cook_time.return_value = None
    scraper.total_time.return_value = None
    scraper.yields.return_value = None
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
    assert result.source_url == "https://example.com/tomato-soup"
    assert result.warnings == ()


def test_recipe_parser_extracts_optional_recipe_metadata() -> None:
    scraper = Mock()
    scraper.title.return_value = "Tomato Soup"
    scraper.ingredients.return_value = ["2 cans tomatoes"]
    scraper.instructions_list.return_value = ["Simmer for 20 minutes."]
    scraper.description.return_value = "A quick pantry soup."
    scraper.image.return_value = "https://example.com/soup.jpg"
    scraper.author.return_value = "Ada Cook"
    scraper.site_name.return_value = "Example Kitchen"
    scraper.prep_time.return_value = 10
    scraper.cook_time.return_value = 20
    scraper.total_time.return_value = 30
    scraper.yields.return_value = "4 servings"
    scraper_factory = Mock(return_value=scraper)

    parser = RecipeParser(
        scraper_factory=cast(ScraperFactory, scraper_factory),
    )

    result = parser.parse(
        html="<html>recipe data</html>",
        source_url="https://example.com/tomato-soup",
    )

    assert result.source_url == "https://example.com/tomato-soup"
    assert result.description == "A quick pantry soup."
    assert result.image_url == "https://example.com/soup.jpg"
    assert result.author == "Ada Cook"
    assert result.site_name == "Example Kitchen"
    assert result.prep_time_minutes == 10
    assert result.cook_time_minutes == 20
    assert result.total_time_minutes == 30
    assert result.yields_text == "4 servings"
    assert result.warnings == ()


def test_recipe_parser_warns_when_optional_metadata_is_missing() -> None:
    scraper = Mock()
    scraper.title.return_value = "Tomato Soup"
    scraper.ingredients.return_value = ["2 cans tomatoes"]
    scraper.instructions_list.return_value = ["Simmer for 20 minutes."]
    scraper.description.side_effect = ElementNotFoundInHtml("description")
    scraper.image.return_value = None
    scraper.author.side_effect = FieldNotProvidedByWebsiteException(
        return_value=None
    )
    scraper.site_name.return_value = None
    scraper.prep_time.return_value = None
    scraper.cook_time.return_value = None
    scraper.total_time.return_value = None
    scraper.yields.return_value = None
    scraper_factory = Mock(return_value=scraper)

    result = RecipeParser(
        scraper_factory=cast(ScraperFactory, scraper_factory),
    ).parse(
        html="<html>recipe data</html>",
        source_url="https://example.com/tomato-soup",
    )

    assert result.description is None
    assert result.author is None
    assert result.warnings == (
        "Description was not provided by the source.",
        "Author was not provided by the source.",
    )


def test_recipe_parser_raises_clear_error_when_title_is_missing() -> None:
    scraper = Mock()
    missing_title_error = ElementNotFoundInHtml("title")
    scraper.title.side_effect = missing_title_error
    parser = RecipeParser(
        scraper_factory=cast(
            ScraperFactory,
            Mock(return_value=scraper),
        ),
    )

    with pytest.raises(RecipeParseError) as error_info:
        parser.parse(
            html="<html>recipe data</html>",
            source_url="https://example.com/tomato-soup",
        )

    assert str(error_info.value) == "Recipe title could not be parsed."
    assert error_info.value.__cause__ is missing_title_error


def test_recipe_parser_warns_when_ingredients_and_steps_are_missing() -> None:
    scraper = Mock()
    scraper.title.return_value = "Tomato Soup"
    scraper.ingredients.side_effect = ElementNotFoundInHtml("ingredients")
    scraper.instructions_list.side_effect = FieldNotProvidedByWebsiteException(
        return_value=None
    )
    scraper.description.return_value = None
    scraper.image.return_value = None
    scraper.author.return_value = None
    scraper.site_name.return_value = None
    scraper.prep_time.return_value = None
    scraper.cook_time.return_value = None
    scraper.total_time.return_value = None
    scraper.yields.return_value = None
    parser = RecipeParser(
        scraper_factory=cast(
            ScraperFactory,
            Mock(return_value=scraper),
        ),
    )

    result = parser.parse(
        html="<html>recipe data</html>",
        source_url="https://example.com/tomato-soup",
    )

    assert result.ingredients == ()
    assert result.instructions == ()
    assert result.warnings == (
        "Ingredients were not provided by the source.",
        "Instructions were not provided by the source.",
    )


@pytest.mark.parametrize(
    "parser_error",
    [
        NoSchemaFoundInWildMode("https://example.com/recipe"),
        RecipeSchemaNotFound("https://example.com/recipe"),
        WebsiteNotImplementedError("example.com"),
    ],
)
def test_recipe_parser_translates_expected_parser_creation_errors(
    parser_error: Exception,
) -> None:
    scraper_factory = Mock(side_effect=parser_error)
    parser = RecipeParser(
        scraper_factory=cast(ScraperFactory, scraper_factory),
    )

    with pytest.raises(RecipeParseError) as error_info:
        parser.parse(
            html="<html>not a recipe</html>",
            source_url="https://example.com/recipe",
        )

    assert str(error_info.value) == "Recipe data could not be found on the page."
    assert error_info.value.__cause__ is parser_error


def test_recipe_parser_does_not_hide_unexpected_factory_errors() -> None:
    unexpected_error = RuntimeError("parser bug")
    parser = RecipeParser(
        scraper_factory=cast(
            ScraperFactory,
            Mock(side_effect=unexpected_error),
        ),
    )

    with pytest.raises(RuntimeError) as error_info:
        parser.parse(
            html="<html>recipe data</html>",
            source_url="https://example.com/recipe",
        )

    assert error_info.value is unexpected_error
