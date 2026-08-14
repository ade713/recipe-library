from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class IngredientDraft(BaseModel):
    position: int = Field(ge=1)
    original_text: str = Field(min_length=1)
    quantity: Decimal | None = None
    quantity_text: str | None = None
    unit: str | None = None
    name: str | None = None
    preparation_note: str | None = None
    is_optional: bool = False
    scale_locked: bool = False
    parse_status: str = "unparsed"


class RecipeStepDraft(BaseModel):
    position: int = Field(ge=1)
    instruction: str = Field(min_length=1)
    section_title: str | None = None


class RecipeTipDraft(BaseModel):
    position: int = Field(ge=1)
    tip: str = Field(min_length=1)


class RecipeBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    source_url: HttpUrl | None = None
    source_domain: str | None = None
    source_site_name: str | None = None
    source_author: str | None = None
    image_url: HttpUrl | None = None
    prep_time_minutes: int | None = Field(default=None, ge=0)
    cook_time_minutes: int | None = Field(default=None, ge=0)
    total_time_minutes: int | None = Field(default=None, ge=0)
    base_servings: Decimal | None = Field(default=None, ge=0)
    servings_unit: str | None = None
    is_favorite: bool = False
    tags: list[str] = Field(default_factory=list)


class RecipeDraft(RecipeBase):
    ingredients: list[IngredientDraft] = Field(default_factory=list)
    steps: list[RecipeStepDraft] = Field(default_factory=list)
    tips: list[RecipeTipDraft] = Field(default_factory=list)


class RecipeCreate(RecipeDraft):
    pass


class RecipeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    source_url: HttpUrl | None = None
    image_url: HttpUrl | None = None
    prep_time_minutes: int | None = Field(default=None, ge=0)
    cook_time_minutes: int | None = Field(default=None, ge=0)
    total_time_minutes: int | None = Field(default=None, ge=0)
    base_servings: Decimal | None = Field(default=None, ge=0)
    servings_unit: str | None = None
    is_favorite: bool | None = None
    tags: list[str] | None = None


class RecipeSummary(BaseModel):
    id: UUID
    title: str
    image_url: str | None = None
    total_time_minutes: int | None = None
    base_servings: Decimal | None = None
    is_favorite: bool
    tags: list[str] = Field(default_factory=list)
