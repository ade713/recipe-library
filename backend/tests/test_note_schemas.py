from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate


@pytest.mark.parametrize("schema", [NoteCreate, NoteUpdate])
def test_note_write_schemas_require_text(
    schema: type[NoteCreate] | type[NoteUpdate],
) -> None:
    with pytest.raises(ValidationError):
        schema(note="")


def test_note_response_reads_orm_attributes() -> None:
    note_id = uuid4()
    note_record = SimpleNamespace(id=note_id, note="Use less salt next time.")

    response = NoteResponse.model_validate(note_record)

    assert response.id == note_id
    assert response.note == "Use less salt next time."
