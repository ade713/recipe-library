"""Shared backend vocabulary."""

from typing import Literal

RecipeImportStatus = Literal["success", "partial", "failed", "blocked", "duplicate"]

SaveableImportStatus = Literal["success", "partial"]

SAVEABLE_IMPORT_STATUSES: frozenset[SaveableImportStatus] = frozenset({"success", "partial"})
