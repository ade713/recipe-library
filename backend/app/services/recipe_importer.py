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
from dataclasses import dataclass
from typing import Literal

from app.schemas.recipe import RecipeDraft
from app.services.recipe_normalizer import NormalizedRecipeDraft, normalize_recipe_draft
from app.services.recipe_parser import ParsedRecipe, RecipeParseError, RecipeParser
from app.services.safe_fetcher import (
    SafeFetchError,
    SafeFetchResult,
    UnsafeUrlError,
    fetch_html_safely,
)

Fetcher = Callable[[str], Awaitable[SafeFetchResult]]
Normalizer = Callable[[ParsedRecipe], NormalizedRecipeDraft]


class RecipeImportError(RuntimeError):
    """Base error for recipe imports that cannot produce a preview."""


class RecipeImportBlockedError(RecipeImportError):
    """Raised when safety checks prohibit an import."""


class RecipeImportFailedError(RecipeImportError):
    """Raised when an import cannot produce usable recipe data."""


@dataclass(frozen=True)
class RecipeImportResult:
    status: Literal["success", "partial"]
    parser_used: str
    draft: RecipeDraft
    warnings: tuple[str, ...]


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

    async def preview_from_url(self, url: str) -> RecipeImportResult:
        try:
            fetch_result = await self._fetcher(url)
        except UnsafeUrlError as error:
            raise RecipeImportBlockedError(
                "Recipe URL was blocked by safety checks."
            ) from error
        except SafeFetchError as error:
            raise RecipeImportFailedError(
                "Recipe page could not be fetched."
            ) from error

        try:
            parsed_recipe = self._parser.parse(
                fetch_result.html,
                fetch_result.final_url,
            )
        except RecipeParseError as error:
            raise RecipeImportFailedError(
                "Recipe data could not be parsed."
            ) from error

        normalized_recipe = self._normalizer(parsed_recipe)
        preview_status: Literal["success", "partial"] = (
            "partial"
            if not normalized_recipe.draft.ingredients
            or not normalized_recipe.draft.steps
            else "success"
        )

        return RecipeImportResult(
            status=preview_status,
            parser_used="recipe-scrapers",
            draft=normalized_recipe.draft,
            warnings=normalized_recipe.warnings,
        )
