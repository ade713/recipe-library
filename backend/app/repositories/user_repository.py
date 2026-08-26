"""Database access for users.

The temporary development-user helper will be replaced during the authentication phase.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import User
from app.schemas.auth import RegisterRequest

DEV_USER_EMAIL = "dev@recipe-library.local"


def get_or_create_dev_user(session: Session) -> User:
    user = session.scalar(select(User).where(User.email == DEV_USER_EMAIL))

    if user is not None:
        return user

    user = User(
        email=DEV_USER_EMAIL,
        password_hash="development-only-not-a-real-hash",
    )
    session.add(user)
    session.flush()

    return user


def create_user(
    session: Session,
    *,
    payload: RegisterRequest,
) -> User | None:
    normalized_email = str(payload.email).strip().lower()

    existing_user = session.scalar(
        select(User).where(User.email == normalized_email)
    )

    if existing_user is not None:
        return None

    user = User(
        email=normalized_email,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    session.flush()
    return user


def get_user_by_email(
    session: Session,
    *,
    email: str,
) -> User | None:
    normalized_email = email.strip().lower()

    return session.scalar(
        select(User).where(User.email == normalized_email)
    )


def get_user_by_id(
    session: Session,
    *,
    user_id: UUID,
) -> User | None:
    return session.get(User, user_id)
