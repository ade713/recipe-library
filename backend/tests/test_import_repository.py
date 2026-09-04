from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import Base, RecipeImport, User
from app.repositories.import_repository import create_import_log


def test_create_import_log_stores_user_scoped_preview_metadata() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(
            email="current@example.com",
            password_hash="test-hash",
        )
        session.add(user)
        session.flush()

        import_log = create_import_log(
            session,
            user_id=user.id,
            source_url="https://example.com/recipe",
            source_domain="example.com",
            status="partial",
            parser_used="recipe-scrapers",
            warnings=["Instructions were not provided by the source."],
            error_message=None,
        )

        stored_log = session.scalar(select(RecipeImport))

        assert import_log.id is not None
        assert stored_log is import_log
        assert import_log.user_id == user.id
        assert import_log.source_url == "https://example.com/recipe"
        assert import_log.source_domain == "example.com"
        assert import_log.status == "partial"
        assert import_log.parser_used == "recipe-scrapers"
        assert import_log.warnings == [
            "Instructions were not provided by the source."
        ]
        assert import_log.error_message is None
