import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, String, Table, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.recipe import Recipe
    from app.models.user import User

recipe_tags = Table(
    "recipe_tags",
    Base.metadata,
    Column("recipe_id", Uuid, ForeignKey("recipes.id"), primary_key=True),
    Column("tag_id", Uuid, ForeignKey("tags.id"), primary_key=True),
)


class Tag(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_tags_user_id_name"),)

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(50), index=True)

    user: Mapped["User"] = relationship(back_populates="tags")
    recipes: Mapped[list["Recipe"]] = relationship(secondary=recipe_tags, back_populates="tags")
