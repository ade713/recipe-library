from uuid import UUID

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    note: str = Field(min_length=1)


class NoteUpdate(BaseModel):
    note: str = Field(min_length=1)


class NoteResponse(BaseModel):
    id: UUID
    note: str
