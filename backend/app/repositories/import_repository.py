from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RecipeImport


def create_import_log(
    session: Session,
    *,
    user_id: UUID,
    source_url: str,
    source_domain: str | None,
    status: str,
    parser_used: str | None,
    warnings: list[str],
    error_message: str | None,
) -> RecipeImport:
    recipe_import = RecipeImport(
        user_id=user_id,
        source_url=source_url,
        source_domain=source_domain,
        status=status,
        parser_used=parser_used,
        warnings=warnings,
        error_message=error_message,
    )
    session.add(recipe_import)
    session.flush()

    return recipe_import


def get_import_log(
    session: Session,
    *,
    user_id: UUID,
    import_id: UUID,
) -> RecipeImport | None:
    statement = (
        select(RecipeImport)
        .where(
            RecipeImport.id == import_id,
            RecipeImport.user_id == user_id,
        )
    )

    return session.scalar(statement)
