from fastapi import APIRouter, HTTPException, status

from app.schemas.auth import LoginRequest, RegisterRequest

router = APIRouter()


@router.post("/register", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def register_user(payload: RegisterRequest) -> None:
    raise HTTPException(status_code=501, detail="Auth registration is not implemented yet.")


@router.post("/login", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def login(payload: LoginRequest) -> None:
    raise HTTPException(status_code=501, detail="Auth login is not implemented yet.")


@router.post("/logout", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def logout() -> None:
    raise HTTPException(status_code=501, detail="Auth logout is not implemented yet.")


@router.get("/me", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def get_me() -> None:
    raise HTTPException(status_code=501, detail="Current user endpoint is not implemented yet.")
