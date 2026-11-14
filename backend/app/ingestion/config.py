from typing import List, Optional
from pydantic import BaseModel, Field


class IngestionConfig(BaseModel):
    source_name: str = "tromoi"
    seed_url: str = "https://tromoi.com/tim-tro-tai-ha-noi"
    scope_city: str = "ha_noi"
    page_limit: Optional[int] = None
    max_listings: Optional[int] = None
    max_concurrency: int = 2
    min_delay_seconds: float = 2.0
    request_timeout_seconds: float = 20.0
    max_retries: int = 3
    retry_backoff_seconds: float = 2.0
    images_enabled: bool = False
    videos_enabled: bool = False
    max_image_bytes: int = 8_000_000  # 8 MB
    storage_dir: str = "storage/raw_images"
    user_agent: str = "AI-Rental-Copilot-Research/1.0 (+project contact)"
    allowed_hosts: List[str] = Field(
        default_factory=lambda: ["tromoi.com", "www.tromoi.com"]
    )
    allowed_image_hosts: List[str] = Field(
        default_factory=lambda: ["tromoi.com", "www.tromoi.com"]
    )
    redact_personal_info: bool = True
