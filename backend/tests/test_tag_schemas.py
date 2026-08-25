from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.tag import TagCreate, TagListResponse, TagResponse, TagUpdate


@pytest.mark.parametrize("schema", [TagCreate, TagUpdate])
@pytest.mark.parametrize("name", ["", "x" * 51])
def test_tag_write_schemas_validate_name_length(
    schema: type[TagCreate] | type[TagUpdate],
    name: str,
) -> None:
    with pytest.raises(ValidationError):
        schema(name=name)


def test_tag_responses_read_orm_attributes() -> None:
    tag_id = uuid4()
    tag_record = SimpleNamespace(id=tag_id, name="Dinner")

    response = TagResponse.model_validate(tag_record)
    list_response = TagListResponse.model_validate({"items": [tag_record]})

    assert response.id == tag_id
    assert response.name == "Dinner"
    assert list_response.items == [response]
