from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    """Report API availability without checking database connectivity."""
    return {"status": "ok"}
