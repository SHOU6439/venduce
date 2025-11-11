from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import EmailStr

from app.db.database import get_db
from app.schemas.user import UserCreate, UserRead, RegistrationResponse
from app.services.user_service import UserService, UserAlreadyExists, ConfirmationError
from app.deps import get_user_service
from app.schemas.auth import LoginRequest, TokenPair
from app.utils import jwt as jwt_utils
from app.models.refresh_token import RefreshToken
from app.utils.timezone import now_utc
from app.core.config import settings
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

    # Send confirmation email (MailHog) in dev if enabled. Also return token for tests/dev convenience.
    from app.utils.mailer import send_confirmation_email

    confirm_url = f"http://localhost:8025/confirm?token={token}"  # developer-friendly MailHog UI link
    # Try to use the template-based mailer; falls back to plain text if templates/Jinja2 are unavailable
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

    return {"message": "confirmation sent", "confirmation_token": token}


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
    return user


@router.post("/resend-confirmation")
def resend(
    email: EmailStr,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    try:
        token = svc.resend_confirmation(db, email)
    except ConfirmationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"message": "confirmation resent", "confirmation_token": token}


@router.post("/login", response_model=TokenPair)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    svc: UserService = Depends(get_user_service),
):
    user = svc.get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_credentials", "message": "Invalid email or password"},
        )

    if not getattr(user, "is_confirmed", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "not_confirmed", "message": "Account not confirmed. Check your email."},
        )

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "inactive_account", "message": "Account is inactive. Contact support."},
        )

    if not svc.pwd_context.verify(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_credentials", "message": "Invalid email or password"},
        )

    access_token, expires_in = jwt_utils.create_access_token(subject=str(user.id))

    days = settings.REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER if getattr(payload, "remember", False) else None
    refresh_token, jwt_id, expires_at = jwt_utils.create_refresh_token(subject=str(user.id), days=days)

    rt = RefreshToken(jti=jwt_id, user_id=str(user.id), expires_at=expires_at, revoked=False)
    db.add(rt)
    db.commit()

    return {"access_token": access_token, "refresh_token": refresh_token, "expires_in": expires_in}



@router.post("/refresh", response_model=TokenPair)
def refresh(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
):
    try:
        data = jwt_utils.decode_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid refresh token")

    if data.get("typ") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token type")

    jti = data.get("jti")
    sub = data.get("sub")
    if not jti or not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token payload")

    rt = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if not rt or rt.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh token revoked or not found")

    now = now_utc()
    if rt.expires_at is None or rt.expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh token expired")

    # TODO: 今の実装だと、リフレッシュトークンのテーブルが無効となったリフレッシュトークンのレコードで肥大化する可能性がある。
    # 定期的に古い revoked トークンを削除するジョブを追加することを検討する。
    # もしくは、ここで削除しても良いかもしれないが、ログ/監査の観点からは好ましくないかもしれない。
    rt.revoked = True
    db.add(rt)
    remaining_days = (rt.expires_at - now).days
    days = settings.REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER if remaining_days > settings.REFRESH_TOKEN_EXPIRE_DAYS else settings.REFRESH_TOKEN_EXPIRE_DAYS

    new_refresh_token, new_jti, new_expires_at = jwt_utils.create_refresh_token(subject=str(sub), days=days)
    new_rt = RefreshToken(jti=new_jti, user_id=str(sub), expires_at=new_expires_at, revoked=False)
    db.add(new_rt)
    db.commit()

    access_token, expires_in = jwt_utils.create_access_token(subject=str(sub))
    return {"access_token": access_token, "refresh_token": new_refresh_token, "expires_in": expires_in}
