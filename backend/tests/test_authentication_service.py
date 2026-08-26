from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Base, User
from app.schemas.auth import LoginRequest
from app.services.authentication import authenticate_user


def test_authenticate_user_accepts_normalized_email_and_correct_password() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(
            email="cook@example.com",
            password_hash=hash_password("correct horse battery staple"),
        )
        session.add(user)
        session.commit()

        authenticated_user = authenticate_user(
            session,
            payload=LoginRequest(
                email="Cook@Example.COM",
                password="correct horse battery staple",
            ),
        )

        assert authenticated_user is not None
        assert authenticated_user.id == user.id


def test_authenticate_user_rejects_wrong_password_and_unknown_email() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(
            User(
                email="cook@example.com",
                password_hash=hash_password("correct horse battery staple"),
            )
        )
        session.commit()

        wrong_password = authenticate_user(
            session,
            payload=LoginRequest(
                email="cook@example.com",
                password="wrong password",
            ),
        )
        unknown_email = authenticate_user(
            session,
            payload=LoginRequest(
                email="missing@example.com",
                password="correct horse battery staple",
            ),
        )

        assert wrong_password is None
        assert unknown_email is None
