import os
import tempfile
import pytest
import httpx
from app.ingestion.config import IngestionConfig
from app.ingestion.media import MediaWorker, detect_image_mime


def test_detect_image_mime():
    jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    assert detect_image_mime(jpeg_bytes) == "image/jpeg"
    assert detect_image_mime(png_bytes) == "image/png"
    assert detect_image_mime(b"<!DOCTYPE html>") is None


def test_case_14_media_permissions_and_limits():
    with tempfile.TemporaryDirectory() as tmp_dir:
        storage_dir = os.path.join(tmp_dir, "images")
        config = IngestionConfig(storage_dir=storage_dir, images_enabled=True, max_image_bytes=100)

        # 1. Permission status not allowed -> skipped
        worker = MediaWorker(config)
        res = worker.download_image("https://tromoi.com/image.jpg", permission_status="unknown")
        assert res["download_status"] == "skipped"

        # 2. Oversized image -> failed
        oversized_data = b"\xff\xd8\xff" + b"A" * 500
        def oversized_handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, content=oversized_data, headers={"Content-Type": "image/jpeg"}, request=request)

        mock_client = httpx.Client(transport=httpx.MockTransport(oversized_handler))
        worker_oversized = MediaWorker(config, client=mock_client)
        res_oversized = worker_oversized.download_image("https://tromoi.com/large.jpg", permission_status="allowed")
        assert res_oversized["download_status"] == "failed"
        assert "exceed" in res_oversized["download_error"].lower()

        # 3. Invalid MIME (HTML pretending to be image) -> failed
        html_data = b"<!DOCTYPE html><html><body>Error</body></html>"
        def invalid_mime_handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, content=html_data, headers={"Content-Type": "image/jpeg"}, request=request)

        mock_client_invalid = httpx.Client(transport=httpx.MockTransport(invalid_mime_handler))
        config_valid_size = IngestionConfig(storage_dir=storage_dir, images_enabled=True, max_image_bytes=10000)
        worker_invalid = MediaWorker(config_valid_size, client=mock_client_invalid)
        res_invalid = worker_invalid.download_image("https://tromoi.com/fake.jpg", permission_status="allowed")
        assert res_invalid["download_status"] == "failed"
        assert "invalid or unsafe image mime" in res_invalid["download_error"].lower()

        # 4. Valid image -> downloaded
        valid_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 20
        def valid_handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, content=valid_jpeg, headers={"Content-Type": "image/jpeg"}, request=request)

        mock_client_valid = httpx.Client(transport=httpx.MockTransport(valid_handler))
        worker_valid = MediaWorker(config_valid_size, client=mock_client_valid)
        res_valid = worker_valid.download_image("https://tromoi.com/valid.jpg", permission_status="allowed")
        assert res_valid["download_status"] == "downloaded"
        assert res_valid["storage_key"] is not None
        assert res_valid["sha256"] is not None
