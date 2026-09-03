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

from recipe_scrapers import AbstractScraper, scrape_html

ScraperFactory = Callable[..., AbstractScraper]


@dataclass(frozen=True)
class ParsedRecipe:
    title: str
    ingredients: tuple[str, ...]
    instructions: tuple[str, ...]
    source_url: str
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
        title = scraper.title()
        ingredients = tuple(scraper.ingredients())
        instructions = tuple(scraper.instructions_list())
        description = scraper.description()
        image_url = scraper.image()
        author = scraper.author()
        site_name = scraper.site_name()
        prep_time_minutes = scraper.prep_time()
        cook_time_minutes = scraper.cook_time()
        total_time_minutes = scraper.total_time()
        yields_text = scraper.yields()

        return ParsedRecipe(
            title=title,
            ingredients=ingredients,
            instructions=instructions,
            source_url=source_url,
            description=description,
            image_url=image_url,
            author=author,
            site_name=site_name,
            prep_time_minutes=prep_time_minutes,
            cook_time_minutes=cook_time_minutes,
            total_time_minutes=total_time_minutes,
            yields_text=yields_text,
        )
