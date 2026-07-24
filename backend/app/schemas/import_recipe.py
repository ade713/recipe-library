from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.recipe import RecipeCreate


class RecipeImportPreviewRequest(BaseModel):
    url: HttpUrl


class RecipeImportPreviewResponse(BaseModel):
    import_id: UUID
    status: str
    parser_used: str | None = None
    draft: RecipeCreate
    warnings: list[str] = Field(default_factory=list)
