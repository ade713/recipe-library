"""Shared backend vocabulary."""

from typing import Literal

RecipeImportStatus = Literal["success", "partial", "failed", "blocked", "duplicate"]

SaveableImportStatus = Literal["success", "partial"]
