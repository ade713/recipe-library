"""Shared backend vocabulary."""

from typing import Literal

IngredientParseStatus = Literal["parsed", "partial", "unparsed"]

DEFAULT_INGREDIENT_PARSE_STATUS: IngredientParseStatus = "unparsed"

RecipeImportNextAction = Literal[
    "open_existing",
    "import_as_copy",
    "enter_manually",
    "open_source_url",
]

RecipeOrigin = Literal["manual", "imported", "edited"]

DEFAULT_RECIPE_ORIGIN: RecipeOrigin = "manual"

RecipeImportStatus = Literal["success", "partial", "failed", "blocked", "duplicate"]

SaveableImportStatus = Literal["success", "partial"]

FailedImportStatus = Literal["blocked", "failed"]

SAVEABLE_IMPORT_STATUSES: frozenset[SaveableImportStatus] = frozenset({"success", "partial"})
