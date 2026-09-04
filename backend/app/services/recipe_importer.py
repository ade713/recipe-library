"""Recipe import orchestration service.

Planned flow:
1. Validate URL.
2. Check access rules when possible.
3. Fetch HTML with timeout.
4. Parse recipe data.
5. Normalize into editable draft.
6. Save import log.
7. Return draft + warnings.
"""

from collections.abc import Awaitable, Callable

from app.services.recipe_normalizer import NormalizedRecipeDraft, normalize_recipe_draft
from app.services.recipe_parser import ParsedRecipe, RecipeParser
from app.services.safe_fetcher import SafeFetchResult, fetch_html_safely

Fetcher = Callable[[str], Awaitable[SafeFetchResult]]
Normalizer = Callable[[ParsedRecipe], NormalizedRecipeDraft]


class RecipeImporter:
    def __init__(
        self,
        fetcher: Fetcher = fetch_html_safely,
        parser: RecipeParser | None = None,
        normalizer: Normalizer = normalize_recipe_draft,
    ) -> None:
        self._fetcher = fetcher
        self._parser = parser if parser is not None else RecipeParser()
        self._normalizer = normalizer

    async def preview_from_url(self, url: str) -> NormalizedRecipeDraft:
        fetch_result = await self._fetcher(url)
        parsed_recipe = self._parser.parse(
            fetch_result.html,
            fetch_result.final_url,
        )

        return self._normalizer(parsed_recipe)
