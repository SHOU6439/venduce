from __future__ import annotations

import mimetypes
from dataclasses import dataclass
from typing import BinaryIO

import magic
from PIL import Image

ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 


@dataclass
class ImageInfo:
    width: int
    height: int


class FileValidationError(Exception):
    pass


def detect_mime_type(filename: str, sample: bytes | None = None) -> str | None:
    """ファイル内容から優先的に MIME を推定し、難しい場合は拡張子で推定する。"""
    if sample:
        detected = magic.from_buffer(sample, mime=True)
        if detected:
            return detected
    mime, _ = mimetypes.guess_type(filename)
    return mime


def assert_allowed_image(content_type: str, size_bytes: int) -> None:
    if content_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise FileValidationError("unsupported image type")
    if size_bytes > MAX_IMAGE_SIZE_BYTES:
        raise FileValidationError("image too large")


def extract_image_info(fileobj: BinaryIO) -> ImageInfo:
    try:
        fileobj.seek(0)
        with Image.open(fileobj) as img:
            img.verify()
        fileobj.seek(0)
        with Image.open(fileobj) as img:
            width, height = img.size
    except Exception as exc: 
        raise FileValidationError("invalid image data") from exc
    finally:
        fileobj.seek(0)
    return ImageInfo(width=width, height=height)


__all__ = [
    "ImageInfo",
    "FileValidationError",
    "detect_mime_type",
    "assert_allowed_image",
    "extract_image_info",
]
