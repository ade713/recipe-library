from decimal import Decimal
from enum import StrEnum
from typing import Protocol
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class NamedTag(Protocol):
    name: str


class IngredientDraft(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

    position: int = Field(ge=1)
    instruction: str = Field(min_length=1)
    section_title: str | None = None


class RecipeTipDraft(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class RecipeRead(RecipeDraft):
    model_config = ConfigDict(from_attributes=True)

    id: UUID

    @field_validator("tags", mode="before")
    @classmethod
    def extract_tag_names(cls, tags: list[str | NamedTag]) -> list[str]:
        return [tag if isinstance(tag, str) else tag.name for tag in tags]


class RecipeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    source_domain: str | None = None
    source_site_name: str | None = None
    source_author: str | None = None
    source_url: HttpUrl | None = None
    image_url: HttpUrl | None = None
    prep_time_minutes: int | None = Field(default=None, ge=0)
    cook_time_minutes: int | None = Field(default=None, ge=0)
    total_time_minutes: int | None = Field(default=None, ge=0)
    base_servings: Decimal | None = Field(default=None, ge=0)
    servings_unit: str | None = None
    is_favorite: bool | None = None
    ingredients: list[IngredientDraft] | None = None
    steps: list[RecipeStepDraft] | None = None
    tips: list[RecipeTipDraft] | None = None
    tags: list[str] | None = None


class RecipeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    image_url: str | None = None
    total_time_minutes: int | None = None
    base_servings: Decimal | None = None
    is_favorite: bool
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def extract_tag_names(cls, tags: list[str | NamedTag]) -> list[str]:
        return [tag if isinstance(tag, str) else tag.name for tag in tags]


class RecipeListResponse(BaseModel):
    items: list[RecipeSummary]


class RecipeSort(StrEnum):
    RECENT = "recent"
    TITLE = "title"
    TIME = "time"
