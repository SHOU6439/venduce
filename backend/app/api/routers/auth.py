from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.utils.mailer import send_confirmation_email

from app.db.database import get_db
from app.schemas.user import UserCreate, UserRead, RegistrationResponse
from app.services.user_service import UserService
from app.exceptions import (
    AuthenticationError,
    ConfirmationError,
    PasswordResetError,
    RefreshTokenError,
    UserAlreadyExists,
)
from app.deps import get_user_service
from app.schemas.auth import (
    LoginRequest,
    TokenPair,
    ResendRequest,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.user import UserRead
from app.utils import jwt as jwt_utils
from app.utils.timezone import now_utc
from app.core.config import settings

from app.core.security import verify_password


router = APIRouter(redirect_slashes=False)


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

    confirm_url = f"{settings.FRONTEND_URL}/confirm?token={token}"
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
    payload: ResendRequest,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    try:
        user = svc.get_user_by_email(db, payload.email)
        if not user:
            raise ConfirmationError("user not found")
        token = svc.resend_confirmation(db, payload.email)
    except ConfirmationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    confirm_url = f"{settings.FRONTEND_URL}/confirm?token={token}"
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
        access_token, refresh_token, expires_in, refresh_expires_in = svc.authenticate_and_issue_tokens(
            db, payload.email, payload.password, remember
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    user = svc.get_user_by_email(db, payload.email)
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        refresh_expires_in=refresh_expires_in,
        user=UserRead.model_validate(user) if user else None,
    )


@router.post("/token", response_model=TokenPair, summary="OAuth2 password token endpoint")
def login_with_password_grant(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    """OAuth2 passwordフローからトークンを発行するエンドポイント"""
    remember = "remember" in (form_data.scopes or [])
    try:
        access_token, refresh_token, expires_in, refresh_expires_in = svc.authenticate_and_issue_tokens(
            db, form_data.username, form_data.password, remember
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    return TokenPair(access_token=access_token, refresh_token=refresh_token, expires_in=expires_in, refresh_expires_in=refresh_expires_in)


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
        new_refresh_token, new_expires_at = svc.rotate_refresh_token(
            db,
            payload.refresh_token,
            lambda ttl_days: jwt_utils.create_refresh_token(subject=str(sub), ttl_days=ttl_days),
        )
    except RefreshTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    access_token, expires_in = jwt_utils.create_access_token(subject=str(sub))
    refresh_expires_in = int((new_expires_at - now_utc()).total_seconds())
    return TokenPair(access_token=access_token, refresh_token=new_refresh_token, expires_in=expires_in, refresh_expires_in=refresh_expires_in)


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


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    """パスワードリセットメールを送信します。

    セキュリティ上、ユーザーが存在しない場合でも同じレスポンスを返します。
    """
    result = svc.request_password_reset(db, payload.email)

    if result:
        token, email = result
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_confirmation_email(
            email,
            "パスワードリセット - Venduce",
            template_name="password_reset",
            context={
                "reset_url": reset_url,
                "expire_minutes": settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
            },
        )

    return {"message": "パスワードリセットのメールを送信しました。メールをご確認ください。"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    """トークンを検証し、新しいパスワードを設定します。"""
    try:
        svc.reset_password(db, payload.token, payload.new_password)
    except PasswordResetError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "パスワードが正常にリセットされました。"}
