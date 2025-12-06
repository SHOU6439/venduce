from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import EmailStr
from app.utils.mailer import send_confirmation_email

from app.db.database import get_db
from app.schemas.user import UserCreate, UserRead, RegistrationResponse
from app.services.user_service import (
    UserService,
    UserAlreadyExists,
    ConfirmationError,
    RefreshTokenError,
    AuthenticationError,
)
from app.deps import get_user_service
from app.schemas.auth import LoginRequest, TokenPair
from app.utils import jwt as jwt_utils
from app.schemas.auth import RefreshRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=RegistrationResponse, status_code=status.HTTP_202_ACCEPTED)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    try:
        user, token = svc.create_provisional_user(db, user_in)
    except UserAlreadyExists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email or username already exists")

    confirm_url = f"http://localhost:8025/confirm?token={token}"
    send_confirmation_email(
        user.email,
        "Confirm your account",
        template_name="confirm",
        context={
            "first_name": user.first_name,
            "last_name": user.last_name,
            "confirm_url": confirm_url,
            "token": token,
        },
    )

    return RegistrationResponse(message="confirmation sent", confirmation_token=token)


@router.post("/confirm", response_model=UserRead)
def confirm(
    token: str,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    try:
        user = svc.confirm_user(db, token)
    except ConfirmationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return UserRead.model_validate(user)


@router.post("/resend-confirmation", response_model=RegistrationResponse)
def resend(
    email: EmailStr,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    try:
        user = svc.get_user_by_email(db, email)
        if not user:
            raise ConfirmationError("user not found")
        token = svc.resend_confirmation(db, email)
    except ConfirmationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    confirm_url = f"http://localhost:8025/confirm?token={token}"
    send_confirmation_email(
        user.email,
        "Confirm your account",
        template_name="confirm",
        context={
            "first_name": user.first_name,
            "last_name": user.last_name,
            "confirm_url": confirm_url,
            "token": token,
        },
    )

    return RegistrationResponse(message="confirmation resent", confirmation_token=token)


@router.post("/login", response_model=TokenPair)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    remember = getattr(payload, "remember", False)
    try:
        access_token, refresh_token, expires_in = svc.authenticate_and_issue_tokens(
            db, payload.email, payload.password, remember
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    return TokenPair(access_token=access_token, refresh_token=refresh_token, expires_in=expires_in)


@router.post("/token", response_model=TokenPair, summary="OAuth2 password token endpoint")
def login_with_password_grant(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    """OAuth2 passwordフローからトークンを発行するエンドポイント"""
    remember = "remember" in (form_data.scopes or [])
    try:
        access_token, refresh_token, expires_in = svc.authenticate_and_issue_tokens(
            db, form_data.username, form_data.password, remember
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    return TokenPair(access_token=access_token, refresh_token=refresh_token, expires_in=expires_in)


@router.post("/refresh", response_model=TokenPair)
def refresh(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    try:
        data = jwt_utils.decode_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid refresh token")

    if data.get("typ") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token type")

    sub = data.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token payload")

    try:
        new_refresh_token = svc.rotate_refresh_token(
            db,
            payload.refresh_token,
            lambda ttl_days: jwt_utils.create_refresh_token(subject=str(sub), ttl_days=ttl_days),
        )
    except RefreshTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    access_token, expires_in = jwt_utils.create_access_token(subject=str(sub))
    return TokenPair(access_token=access_token, refresh_token=new_refresh_token, expires_in=expires_in)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    """リフレッシュトークンを無効化してログアウト処理を実行します。"""
    try:
        data = jwt_utils.decode_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid refresh token")

    if data.get("typ") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token type")

    try:
        svc.logout(db, payload.refresh_token)
    except RefreshTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
