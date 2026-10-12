import os
import io
import shutil
import hashlib
import tempfile
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlparse
import httpx

from app.ingestion.config import IngestionConfig
from app.ingestion.adapters.tromoi import normalize_url


SAFE_IMAGE_MIMES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

# Magic bytes signature validation
IMAGE_SIGNATURES = [
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"RIFF", "image/webp"),  # webp starts with RIFF....WEBP
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
]


def detect_image_mime(header_bytes: bytes) -> Optional[str]:
    """Detect image MIME type from initial magic bytes."""
    for sig, mime in IMAGE_SIGNATURES:
        if header_bytes.startswith(sig):
            if mime == "image/webp" and len(header_bytes) >= 12 and header_bytes[8:12] != b"WEBP":
                continue
            return mime
    return None


class MediaWorker:
    """Authorized image download worker enforcing rights, limits, and safe storage."""

    def __init__(self, config: IngestionConfig, client: Optional[httpx.Client] = None):
        self.config = config
        self._client = client or httpx.Client(
            timeout=config.request_timeout_seconds,
            headers={"User-Agent": config.user_agent},
            follow_redirects=True,
        )
        os.makedirs(self.config.storage_dir, exist_ok=True)

    def validate_image_url(self, url: str) -> str:
        """Ensure image URL host is allowed and safe."""
        norm = normalize_url(url)
        parsed = urlparse(norm)
        host = parsed.netloc.split(":")[0].lower()

        if host not in self.config.allowed_image_hosts:
            raise ValueError(f"Image host '{host}' not allowed")
        return norm

    def download_image(
        self,
        source_url: str,
        permission_status: str = "allowed",
    ) -> Dict[str, Any]:
        """
        Download authorized image asset with byte limits, magic byte verification,
        and atomic file storage.
        """
        if permission_status != "allowed":
            return {
                "download_status": "skipped",
                "download_error": f"Permission status is '{permission_status}' (not 'allowed')",
            }

        if not self.config.images_enabled:
            return {
                "download_status": "skipped",
                "download_error": "Image downloads disabled by configuration",
            }

        try:
            valid_url = self.validate_image_url(source_url)
            
            # Stream download to enforce max_image_bytes strictly before reading all into memory
            with self._client.stream("GET", valid_url) as response:
                if response.status_code != 200:
                    return {
                        "download_status": "failed",
                        "download_error": f"HTTP {response.status_code}",
                    }

                content_len = response.headers.get("Content-Length")
                if content_len and int(content_len) > self.config.max_image_bytes:
                    return {
                        "download_status": "failed",
                        "download_error": f"Content-Length exceeds limit ({content_len} > {self.config.max_image_bytes})",
                    }

                hasher = hashlib.sha256()
                total_bytes = 0
                header_bytes = b""

                with tempfile.NamedTemporaryFile(delete=False, dir=self.config.storage_dir, suffix=".tmp") as tmp_file:
                    tmp_path = tmp_file.name
                    for chunk in response.iter_bytes(chunk_size=16384):
                        if not chunk:
                            continue
                        if len(header_bytes) < 32:
                            header_bytes += chunk[: 32 - len(header_bytes)]
                        total_bytes += len(chunk)
                        if total_bytes > self.config.max_image_bytes:
                            tmp_file.close()
                            os.unlink(tmp_path)
                            return {
                                "download_status": "failed",
                                "download_error": f"Image exceeded max bytes ({total_bytes} > {self.config.max_image_bytes})",
                            }
                        hasher.update(chunk)
                        tmp_file.write(chunk)

                # Validate magic bytes MIME
                detected_mime = detect_image_mime(header_bytes)
                if not detected_mime or detected_mime not in SAFE_IMAGE_MIMES:
                    os.unlink(tmp_path)
                    return {
                        "download_status": "failed",
                        "download_error": f"Invalid or unsafe image MIME signature (detected: {detected_mime})",
                    }

                ext = SAFE_IMAGE_MIMES[detected_mime]
                sha256_hex = hasher.hexdigest()
                
                # Atomic move to storage path {storage_dir}/{sha256[:2]}/{sha256}.{ext}
                subfolder = os.path.join(self.config.storage_dir, sha256_hex[:2])
                os.makedirs(subfolder, exist_ok=True)
                final_filename = f"{sha256_hex}.{ext}"
                final_path = os.path.join(subfolder, final_filename)
                storage_key = f"{sha256_hex[:2]}/{final_filename}"

                shutil.move(tmp_path, final_path)

                return {
                    "download_status": "downloaded",
                    "storage_key": storage_key,
                    "sha256": sha256_hex,
                    "mime_type": detected_mime,
                    "bytes": total_bytes,
                    "download_error": None,
                }

        except Exception as exc:
            return {
                "download_status": "failed",
                "download_error": str(exc),
            }

    def close(self):
        self._client.close()
