from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import EmailStr

from app.db.database import get_db
from app.schemas.user import UserCreate, UserRead, RegistrationResponse
from app.services.user_service import UserService, UserAlreadyExists, ConfirmationError
from app.deps import get_user_service

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
