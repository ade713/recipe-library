from unittest.mock import Mock
from uuid import uuid4

import pytest
from pydantic import HttpUrl
from sqlalchemy.orm import Session

from app.models import Recipe, RecipeImport
from app.schemas.recipe import RecipeCreate
from app.services import import_save

RECIPE_TITLE = "Tomato Soup"
SOURCE_URL = "https://example.com/recipe"
SOURCE_DOMAIN = "example.com"


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
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
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
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
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


@pytest.mark.parametrize("import_status", ["success", "partial"])
def test_save_reviewed_import_returns_recipe_on_save(
    monkeypatch: pytest.MonkeyPatch,
    import_status: str,
) -> None:
    session = Mock(spec=Session)
    user_id = uuid4()
    import_id = uuid4()
    import_log = RecipeImport(
        id=import_id,
        user_id=user_id,
        source_url=SOURCE_URL,
        source_domain=SOURCE_DOMAIN,
        status=import_status,
    )
    payload = RecipeCreate(
        title="An Edited Tomato Soup",
        source_url=HttpUrl("https://a-different-source.com/recipe"),
        source_domain="a-different-source.com",
    )
    original_payload = payload.model_dump()
    recipe = Recipe(id=uuid4(), user_id=user_id, title=RECIPE_TITLE)

    lookup = Mock(return_value=import_log)
    link_mock = Mock(return_value=None)
    create_recipe_mock = Mock(return_value=recipe)

    monkeypatch.setattr(import_save, "get_import_log", lookup)
    monkeypatch.setattr(import_save, "link_import_to_recipe", link_mock)
    monkeypatch.setattr(import_save, "create_recipe_record", create_recipe_mock)

    result = import_save.save_reviewed_import(
        session,
        user_id=user_id,
        import_id=import_id,
        payload=payload,
    )

    assert result is recipe

    saved_payload = create_recipe_mock.call_args.kwargs["payload"]
    assert saved_payload.title == payload.title
    assert str(saved_payload.source_url) == SOURCE_URL
    assert saved_payload.source_domain == SOURCE_DOMAIN
    assert payload.model_dump() == original_payload
    create_recipe_mock.assert_called_once_with(
        session,
        user_id=user_id,
        import_status="imported",
        payload=saved_payload,
    )
    link_mock.assert_called_once_with(session, import_log=import_log, recipe_id=recipe.id)

    session.commit.assert_not_called()
    session.rollback.assert_not_called()
    session.refresh.assert_not_called()
