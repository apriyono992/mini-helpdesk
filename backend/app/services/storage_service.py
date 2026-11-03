import asyncio
import io
import os
import uuid
from PIL import Image

from app.core.config import settings


UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
)


def convert_to_webp(content: bytes, original_ext: str = "png") -> tuple[bytes, str, str]:
    """Convert image bytes to WebP. Fallback to raw bytes if decoding fails."""
    try:
        with Image.open(io.BytesIO(content)) as img:
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                converted = img.convert("RGBA")
            else:
                converted = img.convert("RGB")
            buf = io.BytesIO()
            converted.save(buf, format="WEBP", quality=85)
            return buf.getvalue(), "webp", "image/webp"
    except Exception:
        # ponytail: fallback raw bytes for mock/corrupt streams in test isolation
        return content, original_ext, f"image/{original_ext}"


def is_r2_configured() -> bool:
    has_creds = bool(settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY and settings.R2_BUCKET_NAME)
    has_endpoint = bool(settings.R2_ACCOUNT_ID or settings.R2_ENDPOINT_URL)
    return has_creds and has_endpoint


def _upload_to_r2_sync(content: bytes, filename: str, content_type: str) -> str:
    import boto3
    from botocore.config import Config

    endpoint_url = (
        settings.R2_ENDPOINT_URL
        if settings.R2_ENDPOINT_URL
        else f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    )

    client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=filename,
        Body=content,
        ContentType=content_type,
    )

    if settings.R2_PUBLIC_URL:
        return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{filename}"
    return f"{endpoint_url}/{settings.R2_BUCKET_NAME}/{filename}"


def _save_local_sync(content: bytes, filename: str) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(content)
    return f"/uploads/{filename}"



async def save_attachment(content: bytes, original_filename: str) -> str:
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "png"
    converted_bytes, final_ext, content_type = convert_to_webp(content, original_ext=ext)
    safe_name = f"{uuid.uuid4().hex}.{final_ext}"

    if is_r2_configured():
        return await asyncio.to_thread(_upload_to_r2_sync, converted_bytes, safe_name, content_type)
    return await asyncio.to_thread(_save_local_sync, converted_bytes, safe_name)
