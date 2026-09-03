"""Recipe parsing service.

Current parser:
- Use recipe-scrapers for supported sites and generic structured recipe data.

Later app-owned fallback targets:
- Direct JSON-LD Recipe extraction
- Basic OpenGraph metadata
"""

from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar

from recipe_scrapers import (
    AbstractScraper,
    ElementNotFoundInHtml,
    FieldNotProvidedByWebsiteException,
    NoSchemaFoundInWildMode,
    RecipeSchemaNotFound,
    WebsiteNotImplementedError,
    scrape_html,
)

FieldValue = TypeVar("FieldValue")

ScraperFactory = Callable[..., AbstractScraper]

MISSING_FIELD_ERRORS = (
    ElementNotFoundInHtml,
    FieldNotProvidedByWebsiteException,
)

PARSER_CREATION_ERRORS = (
    NoSchemaFoundInWildMode,
    RecipeSchemaNotFound,
    WebsiteNotImplementedError,
)


@dataclass(frozen=True)
class ParsedRecipe:
    title: str
    ingredients: tuple[str, ...]
    instructions: tuple[str, ...]
    source_url: str
    warnings: tuple[str, ...]
    description: str | None
    image_url: str | None
    author: str | None
    site_name: str | None
    prep_time_minutes: int | None
    cook_time_minutes: int | None
    total_time_minutes: int | None
    yields_text: str | None


class RecipeParseError(RuntimeError):
    """Raised when required recipe data cannot be parsed."""


class RecipeParser:
    def __init__(
        self,
        scraper_factory: ScraperFactory = scrape_html,
    ) -> None:
        self._scraper_factory = scraper_factory

    def parse(
        self,
        html: str,
        source_url: str,
    ) -> ParsedRecipe:
        try:
            scraper = self._scraper_factory(
                html,
                source_url,
                online=False,
                supported_only=False,
            )
        except PARSER_CREATION_ERRORS as error:
            raise RecipeParseError(
                "Recipe data could not be found on the page."
            ) from error

        try:
            title = scraper.title()
        except MISSING_FIELD_ERRORS as error:
            raise RecipeParseError(
                "Recipe title could not be parsed."
            ) from error

        warnings: list[str] = []
        ingredient_values = read_optional_field(
            field_name="Ingredients",
            getter=scraper.ingredients,
            warnings=warnings,
            is_plural=True,
        )
        ingredients = (
            tuple(ingredient_values)
            if ingredient_values is not None
            else ()
        )
        instruction_values = read_optional_field(
            field_name="Instructions",
            getter=scraper.instructions_list,
            warnings=warnings,
            is_plural=True,
        )
        instructions = (
            tuple(instruction_values)
            if instruction_values is not None
            else ()
        )
        description = read_optional_field(
            field_name="Description",
            getter=scraper.description,
            warnings=warnings,
        )
        image_url = read_optional_field(
            field_name="Image Url",
            getter=scraper.image,
            warnings=warnings,
        )
        author = read_optional_field(
            field_name="Author",
            getter=scraper.author,
            warnings=warnings,
        )
        site_name = read_optional_field(
            field_name="Site Name",
            getter=scraper.site_name,
            warnings=warnings,
        )
        prep_time_minutes = read_optional_field(
            field_name="Prep Time Minutes",
            getter=scraper.prep_time,
            warnings=warnings,
        )
        cook_time_minutes = read_optional_field(
            field_name="Cook Time Minutes",
            getter=scraper.cook_time,
            warnings=warnings,
        )
        total_time_minutes = read_optional_field(
            field_name="Total Time Minutes",
            getter=scraper.total_time,
            warnings=warnings,
        )
        yields_text = read_optional_field(
            field_name="Yields Text",
            getter=scraper.yields,
            warnings=warnings,
        )
        collected_warnings = tuple(warnings)

        return ParsedRecipe(
            title=title,
            ingredients=ingredients,
            instructions=instructions,
            source_url=source_url,
            warnings=collected_warnings,
            description=description,
            image_url=image_url,
            author=author,
            site_name=site_name,
            prep_time_minutes=prep_time_minutes,
            cook_time_minutes=cook_time_minutes,
            total_time_minutes=total_time_minutes,
            yields_text=yields_text,
        )


def read_optional_field(
    field_name: str,
    getter: Callable[[], FieldValue],
    warnings: list[str],
    is_plural: bool = False,
) -> FieldValue | None:
    warning_verb = "were" if is_plural else "was"
    try:
        return getter()
    except MISSING_FIELD_ERRORS:
        warnings.append(f"{field_name} {warning_verb} not provided by the source.")
        return None
