from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User
from app.repositories.user_repository import get_user_by_email
from app.schemas.auth import LoginRequest

DUMMY_PASSWORD_HASH = hash_password("dummy-password-not-used-by-a-user")


def authenticate_user(
    session: Session,
    *,
    payload: LoginRequest,
) -> User | None:
    user = get_user_by_email(
        session,
        email=str(payload.email),
    )

    stored_hash = (
        user.password_hash
        if user is not None
        else DUMMY_PASSWORD_HASH
    )
    password_matches = verify_password(
        payload.password,
        stored_hash,
    )

    if user is None or not password_matches:
        return None

    return user
