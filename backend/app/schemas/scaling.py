from typing import Literal

from pydantic import BaseModel, Field


class IngredientScalePreviewRequest(BaseModel):
    line: str = Field(min_length=1)
    multiplier: Literal[1, 2, 3]


class IngredientScalePreviewResponse(BaseModel):
    original_line: str
    scaled_line: str
    multiplier: Literal[1, 2, 3]
