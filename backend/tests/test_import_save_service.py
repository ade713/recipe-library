from unittest.mock import Mock
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.schemas.recipe import RecipeCreate
from app.services import import_save


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
            payload=RecipeCreate(title="Tomato Soup"),
        )

    lookup.assert_called_once_with(
        session,
        user_id=user_id,
        import_id=import_id,
    )
    session.commit.assert_not_called()
