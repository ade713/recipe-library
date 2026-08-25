from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest, UserResponse


def test_register_request_requires_valid_email_and_password_length() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(email="not-an-email", password="password")

    with pytest.raises(ValidationError):
        RegisterRequest(email="cook@example.com", password="short")


def test_user_response_reads_orm_attributes_without_exposing_password_hash() -> None:
    user_id = uuid4()
    user_record = SimpleNamespace(
        id=user_id,
        email="cook@example.com",
        password_hash="must-not-be-exposed",
    )

    response = UserResponse.model_validate(user_record)

    assert response.id == user_id
    assert response.email == "cook@example.com"
    assert "password_hash" not in response.model_dump()
