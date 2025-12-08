from __future__ import annotations

import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps import get_current_user, get_asset_service
from app.models.enums import AssetPurpose
from app.models.user import User
from app.schemas.asset import AssetRead
from app.services.asset_service import AssetService
from app.utils.file_validation import (
    assert_allowed_image,
    detect_mime_type,
    extract_image_info,
    FileValidationError,
)

MIME_SAMPLE_BYTES = 4096

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
async def upload_image(
    purpose: str = Form(..., description="画像用途を示す文字列"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    asset_service: AssetService = Depends(get_asset_service),
):
    try:
        purpose_enum = AssetPurpose(purpose.strip().lower())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unsupported purpose") from exc

    file.file.seek(0, os.SEEK_END)
    size_bytes = file.file.tell()
    file.file.seek(0)
    if size_bytes <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty file")

    sample = file.file.read(MIME_SAMPLE_BYTES)
    file.file.seek(0)
    content_type = detect_mime_type(file.filename or "", sample) or file.content_type
    if not content_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="could not detect mime type")

    try:
        assert_allowed_image(content_type, size_bytes)
        image_info = extract_image_info(file.file)
    except FileValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    asset = asset_service.create_asset(
        db,
        owner_id=current_user.id,
        owner_type="user",
        purpose=purpose_enum.value,
        filename=file.filename or "upload.bin",
        content_type=content_type,
        fileobj=file.file,
        size_bytes=size_bytes,
        width=image_info.width,
        height=image_info.height,
    )

    return AssetRead.model_validate(asset, from_attributes=True)
