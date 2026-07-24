import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin


class RecipeStep(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "recipe_steps"

    recipe_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("recipes.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    instruction: Mapped[str] = mapped_column(Text)
    section_title: Mapped[str | None] = mapped_column(String(255))

    recipe: Mapped["Recipe"] = relationship(back_populates="steps")


class RecipeTip(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "recipe_tips"

    recipe_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("recipes.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    tip: Mapped[str] = mapped_column(Text)

    recipe: Mapped["Recipe"] = relationship(back_populates="tips")
