import uuid

from sqlalchemy import JSON, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class RecipeImport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "recipe_imports"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), index=True)
    recipe_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("recipes.id"), index=True)
    source_url: Mapped[str] = mapped_column(Text)
    source_domain: Mapped[str | None] = mapped_column(String(255), index=True)
    parser_used: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), index=True)
    raw_data: Mapped[dict | None] = mapped_column(JSON)
    warnings: Mapped[list | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)
