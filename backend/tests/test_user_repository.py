from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.models import Base, User
from app.repositories.user_repository import get_or_create_dev_user


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
