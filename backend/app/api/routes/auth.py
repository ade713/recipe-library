from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.repositories.user_repository import create_user as create_user_record
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    payload: RegisterRequest,
    session: Annotated[Session, Depends(get_db)],
) -> User:
    try:
        user = create_user_record(
            session,
            payload=payload,
        )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered.",
            )

        session.commit()
        session.refresh(user)
        return user
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        ) from error
    except Exception:
        session.rollback()
        raise


@router.post("/login", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def login(payload: LoginRequest) -> None:
    raise HTTPException(status_code=501, detail="Auth login is not implemented yet.")


@router.post("/logout", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def logout() -> None:
    raise HTTPException(status_code=501, detail="Auth logout is not implemented yet.")


@router.get("/me", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def get_me() -> None:
    raise HTTPException(status_code=501, detail="Current user endpoint is not implemented yet.")
