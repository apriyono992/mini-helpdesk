import io
import os
import pytest
from httpx import AsyncClient
from PIL import Image
from unittest.mock import MagicMock, patch

from app.core.config import settings
from app.services import storage_service
from tests.conftest import _login, _register, _create_user, _create_ticket


def _create_test_image(format: str = "PNG", mode: str = "RGB", size: tuple[int, int] = (10, 10)) -> bytes:
    buf = io.BytesIO()
    img = Image.new(mode, size, color="blue")
    img.save(buf, format=format)
    return buf.getvalue()


def test_convert_to_webp_valid_png():
    png_bytes = _create_test_image("PNG")
    webp_bytes, ext, mime = storage_service.convert_to_webp(png_bytes, "png")
    assert ext == "webp"
    assert mime == "image/webp"
    assert webp_bytes != png_bytes

    # Verify output is valid webp
    with Image.open(io.BytesIO(webp_bytes)) as parsed:
        assert parsed.format == "WEBP"


def test_convert_to_webp_fallback_on_invalid_bytes():
    corrupt_bytes = b"not-a-valid-image"
    res_bytes, ext, mime = storage_service.convert_to_webp(corrupt_bytes, "png")
    assert res_bytes == corrupt_bytes
    assert ext == "png"
    assert mime == "image/png"


@pytest.mark.asyncio
async def test_save_attachment_local_fallback():
    png_bytes = _create_test_image("PNG")
    # Ensure R2 is not configured
    with patch.object(storage_service, "is_r2_configured", return_value=False):
        url = await storage_service.save_attachment(png_bytes, "photo.png")
        assert url.startswith("/uploads/")
        assert url.endswith(".webp")

        filename = url.replace("/uploads/", "")
        file_path = os.path.join(storage_service.UPLOAD_DIR, filename)
        assert os.path.exists(file_path)


        # Cleanup test file
        if os.path.exists(file_path):
            os.remove(file_path)


@pytest.mark.asyncio
async def test_save_attachment_r2_upload():
    png_bytes = _create_test_image("PNG")

    mock_s3 = MagicMock()
    with patch.object(storage_service, "is_r2_configured", return_value=True), \
         patch.object(settings, "R2_BUCKET_NAME", "test-bucket"), \
         patch.object(settings, "R2_PUBLIC_URL", "https://pub-r2.test"), \
         patch("boto3.client", return_value=mock_s3):

        url = await storage_service.save_attachment(png_bytes, "pic.png")
        assert url.startswith("https://pub-r2.test/")
        assert url.endswith(".webp")
        mock_s3.put_object.assert_called_once()
        call_kwargs = mock_s3.put_object.call_args[1]
        assert call_kwargs["Bucket"] == "test-bucket"
        assert call_kwargs["ContentType"] == "image/webp"


@pytest.mark.asyncio
async def test_ticket_upload_real_image_converts_to_webp(client: AsyncClient):
    tok = await _register(client, "AttachBizWebp", "admin-webp@biz.com")
    cust = await _create_user(client, tok["access_token"], "cust-webp@biz.com", "customer")
    cust_token = (await _login(client, "cust-webp@biz.com"))["access_token"]

    ticket = await _create_ticket(client, cust_token, "WebP conversion ticket")
    t_id = ticket["id"]

    png_bytes = _create_test_image("PNG", size=(20, 20))
    res = await client.post(
        f"/tickets/{t_id}/attachments",
        headers={"Authorization": f"Bearer {cust_token}"},
        files={"file": ("sample.png", png_bytes, "image/png")},
    )
    assert res.status_code == 200
    att_url = res.json()["attachment_url"]
    assert att_url.startswith("/uploads/")
    assert att_url.endswith(".webp")

    # Fetch file via static files endpoint and verify WebP header
    get_file = await client.get(att_url)
    assert get_file.status_code == 200
    with Image.open(io.BytesIO(get_file.content)) as img:
        assert img.format == "WEBP"
