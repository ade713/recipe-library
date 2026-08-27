from datetime import timedelta

import pytest
from jwt import InvalidTokenError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_creates_salted_non_plaintext_hash() -> None:
    password = "correct horse battery staple"

    first_hash = hash_password(password)
    second_hash = hash_password(password)

    assert first_hash != password
    assert second_hash != password
    assert first_hash != second_hash


def test_verify_password_accepts_match_and_rejects_wrong_password() -> None:
    password_hash = hash_password("correct horse battery staple")

    assert verify_password("correct horse battery staple", password_hash) is True
    assert verify_password("wrong password", password_hash) is False


def test_access_token_round_trip_returns_subject() -> None:
    token = create_access_token("user-id-123")

    assert decode_access_token(token) == "user-id-123"


def test_access_token_rejects_expired_and_tampered_tokens() -> None:
    expired_token = create_access_token(
        "user-id-123",
        expires_delta=timedelta(seconds=-1),
    )
    valid_token = create_access_token("user-id-123")

    with pytest.raises(InvalidTokenError):
        decode_access_token(expired_token)

    with pytest.raises(InvalidTokenError):
        decode_access_token(f"{valid_token}tampered")
