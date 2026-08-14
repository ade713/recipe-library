from fastapi import APIRouter

from app.schemas.scaling import IngredientScalePreviewRequest, IngredientScalePreviewResponse
from app.services.scaling import scale_ingredient_line

router = APIRouter()


@router.post("/scale-preview", response_model=IngredientScalePreviewResponse)
def scale_preview(payload: IngredientScalePreviewRequest) -> IngredientScalePreviewResponse:
    original_line = payload.line
    multiplier = payload.multiplier
    scaled_line = scale_ingredient_line(original_line, multiplier)

    return IngredientScalePreviewResponse(
        original_line=original_line,
        scaled_line=scaled_line,
        multiplier=multiplier,
    )
