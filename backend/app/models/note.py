import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.recipe import Recipe
    from app.models.user import User

class RecipeNote(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "recipe_notes"

    recipe_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("recipes.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), index=True)
    note: Mapped[str] = mapped_column(Text)

    recipe: Mapped["Recipe"] = relationship(back_populates="notes")
    user: Mapped["User"] = relationship(back_populates="notes")
