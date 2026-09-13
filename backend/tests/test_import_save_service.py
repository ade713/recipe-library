from unittest.mock import Mock
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models import RecipeImport
from app.schemas.recipe import RecipeCreate
from app.services import import_save

RECIPE_TITLE = "Tomato Soup"


def test_save_reviewed_import_rejects_missing_import(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = Mock(spec=Session)
    user_id = uuid4()
    import_id = uuid4()
    lookup = Mock(return_value=None)

    monkeypatch.setattr(import_save, "get_import_log", lookup)

    with pytest.raises(import_save.ImportNotFoundError):
        import_save.save_reviewed_import(
            session,
            user_id=user_id,
            import_id=import_id,
            payload=RecipeCreate(title=RECIPE_TITLE),
        )

    lookup.assert_called_once_with(
        session,
        user_id=user_id,
        import_id=import_id,
    )
    session.commit.assert_not_called()


@pytest.mark.parametrize("import_status", ["failed", "blocked", "duplicate"])
def test_save_reviewed_import_rejects_unsaveable_status(
    monkeypatch: pytest.MonkeyPatch,
    import_status: str,
) -> None:
    session = Mock(spec=Session)
    user_id = uuid4()
    import_id = uuid4()
    import_log = RecipeImport(
        id=import_id,
        user_id=user_id,
        recipe_id=None,
        source_url="https://example.com/recipe",
        source_domain="example.com",
        status=import_status,
    )
    lookup = Mock(return_value=import_log)

    monkeypatch.setattr(import_save, "get_import_log", lookup)

    with pytest.raises(import_save.ImportNotSaveableError):
        import_save.save_reviewed_import(
            session,
            user_id=user_id,
            import_id=import_id,
            payload=RecipeCreate(title=RECIPE_TITLE),
        )

    session.commit.assert_not_called()


@pytest.mark.parametrize("import_status", ["success", "partial"])
def test_save_reviewed_import_rejects_existing_recipe_link(
    monkeypatch: pytest.MonkeyPatch,
    import_status: str,
) -> None:
    session = Mock(spec=Session)
    user_id = uuid4()
    import_id = uuid4()
    import_log = RecipeImport(
        id=import_id,
        user_id=user_id,
        recipe_id=uuid4(),
        source_url="https://example.com/recipe",
        source_domain="example.com",
        status=import_status,
    )
    lookup = Mock(return_value=import_log)

    monkeypatch.setattr(import_save, "get_import_log", lookup)

    with pytest.raises(import_save.ImportAlreadySavedError):
        import_save.save_reviewed_import(
            session,
            user_id=user_id,
            import_id=import_id,
            payload=RecipeCreate(title=RECIPE_TITLE),
        )

    session.commit.assert_not_called()
