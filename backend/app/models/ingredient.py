import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.recipe import Recipe

class RecipeIngredient(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "recipe_ingredients"

    recipe_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("recipes.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    original_text: Mapped[str] = mapped_column(Text)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    quantity_text: Mapped[str | None] = mapped_column(String(50))
    unit: Mapped[str | None] = mapped_column(String(50))
    name: Mapped[str | None] = mapped_column(String(255), index=True)
    preparation_note: Mapped[str | None] = mapped_column(String(255))
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False)
    scale_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    parse_status: Mapped[str] = mapped_column(String(50), default="unparsed")

    recipe: Mapped["Recipe"] = relationship(back_populates="ingredients")
