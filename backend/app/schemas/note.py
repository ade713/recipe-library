from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NoteCreate(BaseModel):
    note: str = Field(min_length=1)


class NoteUpdate(BaseModel):
    note: str = Field(min_length=1)


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    note: str
