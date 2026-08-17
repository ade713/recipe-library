import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.tag import recipe_tags

if TYPE_CHECKING:
    from app.models.ingredient import RecipeIngredient
    from app.models.note import RecipeNote
    from app.models.step import RecipeStep, RecipeTip
    from app.models.tag import Tag
    from app.models.user import User


class Recipe(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "recipes"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_domain: Mapped[str | None] = mapped_column(String(255), index=True)
    source_site_name: Mapped[str | None] = mapped_column(String(255))
    source_author: Mapped[str | None] = mapped_column(String(255))
    image_url: Mapped[str | None] = mapped_column(Text)
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer)
    cook_time_minutes: Mapped[int | None] = mapped_column(Integer)
    total_time_minutes: Mapped[int | None] = mapped_column(Integer, index=True)
    base_servings: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    servings_unit: Mapped[str | None] = mapped_column(String(50))
    difficulty: Mapped[str | None] = mapped_column(String(50))
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    import_status: Mapped[str] = mapped_column(String(50), default="manual")

    user: Mapped["User"] = relationship(back_populates="recipes")
    ingredients: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan", order_by="RecipeIngredient.position"
    )
    steps: Mapped[list["RecipeStep"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan", order_by="RecipeStep.position"
    )
    tips: Mapped[list["RecipeTip"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan", order_by="RecipeTip.position"
    )
    notes: Mapped[list["RecipeNote"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan"
    )
    tags: Mapped[list["Tag"]] = relationship(secondary=recipe_tags, back_populates="recipes")
