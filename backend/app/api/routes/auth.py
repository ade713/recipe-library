from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user as get_session_current_user
from app.core.database import get_db
from app.core.security import create_access_token
from app.models import User
from app.repositories.user_repository import create_user as create_user_record
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.authentication import authenticate_user

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


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    session: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    user = authenticate_user(session, payload=payload)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(str(user.id))

    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    _current_user: Annotated[User, Depends(get_session_current_user)],
) -> None:
    return None


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: Annotated[User, Depends(get_session_current_user)]
) -> User:
    return current_user
