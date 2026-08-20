"""Database access for users.

The temporary development-user helper will be replaced during the authentication phase.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User

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
