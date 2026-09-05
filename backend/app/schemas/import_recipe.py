from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.recipe import RecipeDraft

RecipeImportNextAction = Literal[
    "open_existing",
    "import_as_copy",
    "enter_manually",
    "open_source_url",
]


class RecipeImportPreviewRequest(BaseModel):
    url: HttpUrl
    import_as_copy: bool = False


class RecipeImportPreviewResponse(BaseModel):
    import_id: UUID
    status: Literal["success", "partial", "failed", "blocked", "duplicate"]
    parser_used: str | None = None
    draft: RecipeDraft | None
    warnings: list[str] = Field(default_factory=list)
    existing_recipe_id: UUID | None = None
    next_actions: list[RecipeImportNextAction] = Field(default_factory=list)
