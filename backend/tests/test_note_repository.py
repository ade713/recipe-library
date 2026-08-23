from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import Base, Recipe, RecipeNote, User
from app.repositories.note_repository import create_note, list_notes
from app.schemas.note import NoteCreate


def test_create_and_list_notes_are_scoped_to_owned_recipe() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        owner = User(email="owner@example.com", password_hash="owner-hash")
        other_user = User(email="other@example.com", password_hash="other-hash")
        recipe = Recipe(
            user=owner,
            title="Tomato Soup",
            notes=[RecipeNote(user=owner, note="Use less salt.")],
        )
        empty_recipe = Recipe(user=owner, title="Pasta")
        other_recipe = Recipe(user=other_user, title="Secret Cake")
        session.add_all([recipe, empty_recipe, other_recipe])
        session.commit()

        created_note = create_note(
            session,
            user_id=owner.id,
            recipe_id=recipe.id,
            payload=NoteCreate(note="Add more basil."),
        )
        assert created_note is not None
        assert created_note.id is not None

        hidden_create = create_note(
            session,
            user_id=owner.id,
            recipe_id=other_recipe.id,
            payload=NoteCreate(note="This must not be saved."),
        )
        notes = list_notes(
            session,
            user_id=owner.id,
            recipe_id=recipe.id,
        )
        empty_notes = list_notes(
            session,
            user_id=owner.id,
            recipe_id=empty_recipe.id,
        )
        hidden_notes = list_notes(
            session,
            user_id=owner.id,
            recipe_id=other_recipe.id,
        )
        session.commit()

        assert created_note.user_id == owner.id
        assert created_note.recipe_id == recipe.id
        assert hidden_create is None
        assert notes is not None
        assert {note.note for note in notes} == {"Use less salt.", "Add more basil."}
        assert {note.user_id for note in notes} == {owner.id}
        assert empty_notes == []
        assert hidden_notes is None
        assert session.scalar(
            select(RecipeNote).where(RecipeNote.note == "This must not be saved.")
        ) is None
