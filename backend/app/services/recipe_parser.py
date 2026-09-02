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

        return ParsedRecipe(
            title=title,
            ingredients=ingredients,
            instructions=instructions,
        )
