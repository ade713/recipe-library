"""Security helpers."""

from datetime import UTC, datetime, timedelta

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import get_settings

JWT_ALGORITHM = "HS256"

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(plain_password: str, stored_password_hash: str) -> bool:
    return password_hasher.verify(plain_password, stored_password_hash)


def create_access_token(
    subject: str,
    *,
    expires_delta: timedelta | None = None,
) -> str:
    settings = get_settings()

    if expires_delta is None:
        expires_delta = timedelta(
            minutes=settings.access_token_expire_minutes
        )

    expires_at = datetime.now(UTC) + expires_delta
    payload = {
        "sub": subject,
        "exp": expires_at,
    }

    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    settings = get_settings()

    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[JWT_ALGORITHM],
    )
    subject = payload.get("sub")

    if not isinstance(subject, str):
        raise InvalidTokenError("Token subject is missing.")

    return subject
