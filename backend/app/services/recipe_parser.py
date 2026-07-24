"""Recipe parsing service.

First parser target:
- Use recipe-scrapers for supported sites and structured recipe data.

Later fallback targets:
- JSON-LD Recipe objects
- Microdata/RDFa
- Basic OpenGraph metadata
"""


class RecipeParser:
    def parse(self, html: str, source_url: str) -> None:
        raise NotImplementedError("Implement during the import preview phase.")
