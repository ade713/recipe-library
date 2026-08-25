from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class TagUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class TagListResponse(BaseModel):
    items: list[TagResponse]
