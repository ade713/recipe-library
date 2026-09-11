"""Shared backend vocabulary."""

from typing import Literal

RecipeImportNextAction = Literal[
    "open_existing",
    "import_as_copy",
    "enter_manually",
    "open_source_url",
]

RecipeImportStatus = Literal["success", "partial", "failed", "blocked", "duplicate"]

SaveableImportStatus = Literal["success", "partial"]

FailedImportStatus = Literal["blocked", "failed"]

SAVEABLE_IMPORT_STATUSES: frozenset[SaveableImportStatus] = frozenset({"success", "partial"})
