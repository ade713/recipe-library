"""Recipe parsing service.

First parser target:
- Use recipe-scrapers for supported sites and structured recipe data.

Later fallback targets:
- JSON-LD Recipe objects
- Microdata/RDFa
- Basic OpenGraph metadata
"""

from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar

from recipe_scrapers import (
    AbstractScraper,
    ElementNotFoundInHtml,
    FieldNotProvidedByWebsiteException,
    scrape_html,
)

FieldValue = TypeVar("FieldValue")

ScraperFactory = Callable[..., AbstractScraper]


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
        scraper = self._scraper_factory(
            html,
            source_url,
            online=False,
            supported_only=False,
        )

        warnings: list[str] = []
        title = scraper.title()
        ingredients = tuple(scraper.ingredients())
        instructions = tuple(scraper.instructions_list())
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
) -> FieldValue | None:
    try:
        return getter()
    except (
        ElementNotFoundInHtml,
        FieldNotProvidedByWebsiteException,
    ):
        warnings.append(f"{field_name} was not provided by the source.")
        return None
