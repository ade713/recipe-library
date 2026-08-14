from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.recipe import RecipeDraft


class RecipeImportPreviewRequest(BaseModel):
    url: HttpUrl


class RecipeImportPreviewResponse(BaseModel):
    import_id: UUID
    status: Literal["success", "partial", "failed", "blocked", "duplicate"]
    parser_used: str | None = None
    draft: RecipeDraft | None
    warnings: list[str] = Field(default_factory=list)
