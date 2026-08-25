from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models import Base, User
from app.repositories.user_repository import create_user, get_or_create_dev_user
from app.schemas.auth import RegisterRequest


def test_get_or_create_dev_user_reuses_existing_user() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        first_user = get_or_create_dev_user(session)
        second_user = get_or_create_dev_user(session)
        session.commit()

        user_count = session.scalar(select(func.count()).select_from(User))

        assert first_user.id == second_user.id
        assert first_user.email == "dev@recipe-library.local"
        assert user_count == 1


def test_create_user_normalizes_email_hashes_password_and_rejects_duplicate() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        created_user = create_user(
            session,
            payload=RegisterRequest(
                email="Cook@Example.COM",
                password="correct horse battery staple",
            ),
        )
        assert created_user is not None
        assert created_user.id is not None

        duplicate_user = create_user(
            session,
            payload=RegisterRequest(
                email="cook@example.com",
                password="another secure password",
            ),
        )
        session.commit()

        assert created_user.email == "cook@example.com"
        assert created_user.password_hash != "correct horse battery staple"
        assert verify_password(
            "correct horse battery staple",
            created_user.password_hash,
        )
        assert duplicate_user is None
        user_count = session.scalar(select(func.count()).select_from(User))
        assert user_count == 1
