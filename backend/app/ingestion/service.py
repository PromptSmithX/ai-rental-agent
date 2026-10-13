import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.domain.ingestion_models import (
    IngestionRun,
    RawListing,
    RawListingSnapshot,
    RawListingImage,
    IngestionError,
)
from app.schemas.raw_listing import RawListingPayload
from app.ingestion.config import IngestionConfig
from app.ingestion.adapters.tromoi import (
    TromoiSourceAdapter,
    normalize_url,
    compute_content_sha256,
)
from app.ingestion.collector import Collector, CollectorError
from app.ingestion.media import MediaWorker


class IngestionService:
    """Orchestrates discovery, extraction, content hashing, snapshots, and persistence."""

    def __init__(
        self,
        db: Session,
        config: IngestionConfig,
        collector: Optional[Collector] = None,
        media_worker: Optional[MediaWorker] = None,
    ):
        self.db = db
        self.config = config
        self.collector = collector or Collector(config)
        self.media_worker = media_worker or MediaWorker(config)

    def create_or_get_run(self, run_id: Optional[uuid.UUID] = None) -> IngestionRun:
        """Create a new run or retrieve existing run to resume."""
        if run_id:
            run = self.db.query(IngestionRun).filter(IngestionRun.id == run_id).first()
            if run:
                run.status = "running"
                self.db.commit()
                return run

        new_run = IngestionRun(
            id=uuid.uuid4(),
            source_name=self.config.source_name,
            scope_city=self.config.scope_city,
            started_at=datetime.now(timezone.utc),
            status="running",
            source_category_url=self.config.seed_url,
            config_snapshot=self.config.model_dump(),
            discovered_count=0,
            fetched_count=0,
            failed_count=0,
            changed_count=0,
            error_summary={},
        )
        self.db.add(new_run)
        self.db.commit()
        return new_run

    def record_error(
        self,
        run: IngestionRun,
        stage: str,
        error_code: str,
        message: str,
        source_url: Optional[str] = None,
        retryable: bool = False,
    ):
        """Record an error in ingestion_errors and update run stats."""
        err = IngestionError(
            id=uuid.uuid4(),
            run_id=run.id,
            source_url=source_url,
            stage=stage,
            error_code=error_code,
            message=message[:2000] if message else None,
            occurred_at=datetime.now(timezone.utc),
            retryable=retryable,
        )
        self.db.add(err)
        run.failed_count += 1
        summary = dict(run.error_summary or {})
        summary[error_code] = summary.get(error_code, 0) + 1
        run.error_summary = summary
        self.db.commit()

    def persist_listing_payload(
        self,
        payload: RawListingPayload,
        run: IngestionRun,
        permission_status: str = "allowed",
    ) -> Tuple[RawListing, Optional[RawListingSnapshot], bool]:
        """
        Persist listing payload idempotently:
        - Creates/updates RawListing
        - Creates RawListingSnapshot ONLY if content hash changed
        - Records image references and handles authorized image downloading
        Returns (listing, snapshot, is_changed).
        """
        norm_url = normalize_url(payload.source.url or "")
        content_hash = compute_content_sha256(payload)
        now = datetime.now(timezone.utc)

        # 1. Lookup or create RawListing
        listing = (
            self.db.query(RawListing)
            .filter(
                RawListing.source_name == payload.source.site,
                RawListing.normalized_source_url == norm_url,
            )
            .first()
        )

        if not listing:
            listing = RawListing(
                id=uuid.uuid4(),
                source_name=payload.source.site,
                normalized_source_url=norm_url,
                source_listing_id=payload.source.source_listing_id,
                scope_city=payload.source.scope_city,
                first_seen_at=now,
                last_seen_at=now,
                is_active_in_source=True,
            )
            self.db.add(listing)
            self.db.flush()
        else:
            listing.last_seen_at = now
            listing.is_active_in_source = True

        # 2. Check snapshot by content_sha256
        existing_snapshot = (
            self.db.query(RawListingSnapshot)
            .filter(
                RawListingSnapshot.raw_listing_id == listing.id,
                RawListingSnapshot.content_sha256 == content_hash,
            )
            .first()
        )

        if existing_snapshot:
            # Unchanged content: do not insert duplicate snapshot
            self.db.commit()
            return listing, existing_snapshot, False

        # 3. New snapshot for changed/new content
        snapshot = RawListingSnapshot(
            id=uuid.uuid4(),
            raw_listing_id=listing.id,
            run_id=run.id,
            captured_at=now,
            schema_version=payload.schema_version,
            content_sha256=content_hash,
            payload=payload.model_dump(),
        )
        self.db.add(snapshot)
        self.db.flush()

        listing.latest_snapshot_id = snapshot.id
        run.changed_count += 1

        # 4. Process images
        for img_ref in payload.media.images:
            norm_img_url = normalize_url(img_ref.source_url)
            existing_img = (
                self.db.query(RawListingImage)
                .filter(
                    RawListingImage.raw_listing_id == listing.id,
                    RawListingImage.source_url == norm_img_url,
                )
                .first()
            )

            if not existing_img:
                raw_img = RawListingImage(
                    id=uuid.uuid4(),
                    raw_listing_id=listing.id,
                    first_seen_snapshot_id=snapshot.id,
                    position=img_ref.position,
                    source_url=norm_img_url,
                    alt_raw=img_ref.alt_raw,
                    permission_status=permission_status,
                    download_status="not_attempted",
                    collected_at=now,
                )
                self.db.add(raw_img)
                self.db.flush()

                # Authorized download if enabled
                if self.config.images_enabled:
                    dl_result = self.media_worker.download_image(
                        norm_img_url, permission_status=permission_status
                    )
                    raw_img.download_status = dl_result["download_status"]
                    raw_img.download_error = dl_result.get("download_error")
                    if dl_result["download_status"] == "downloaded":
                        raw_img.storage_key = dl_result.get("storage_key")
                        raw_img.sha256 = dl_result.get("sha256")
                        raw_img.mime_type = dl_result.get("mime_type")
                        raw_img.bytes = dl_result.get("bytes")
                        raw_img.downloaded_at = datetime.now(timezone.utc)

        self.db.commit()
        return listing, snapshot, True

    def process_detail_url(
        self,
        url: str,
        run: IngestionRun,
        category_url: Optional[str] = None,
        permission_status: str = "allowed",
    ) -> bool:
        """Fetch, parse, and persist a single detail page transactionally."""
        try:
            fetch_time = datetime.now(timezone.utc).isoformat()
            resp = self.collector.fetch(url)
            payload = TromoiSourceAdapter.parse_detail_page(
                html_content=resp.text,
                source_url=str(resp.url),
                category_url=category_url or self.config.seed_url,
                fetched_at=fetch_time,
                http_status=resp.status_code,
            )

            self.persist_listing_payload(payload, run, permission_status=permission_status)
            run.fetched_count += 1
            self.db.commit()
            return True

        except CollectorError as err:
            self.db.rollback()
            self.record_error(
                run,
                stage="fetch_detail",
                error_code=err.error_code,
                message=err.message,
                source_url=url,
                retryable=err.retryable,
            )
            if err.error_code == "HTTP_403_STOP":
                raise
            return False

        except Exception as exc:
            self.db.rollback()
            self.record_error(
                run,
                stage="parse_or_persist",
                error_code="UNEXPECTED_EXCEPTION",
                message=str(exc),
                source_url=url,
                retryable=False,
            )
            return False

    def run_crawl(
        self,
        run_id: Optional[uuid.UUID] = None,
        max_listings: Optional[int] = None,
        resume: bool = False,
        permission_status: str = "allowed",
    ) -> IngestionRun:
        """
        Execute bounded crawl:
        - Discover Hanoi detail links across pagination
        - Skip already processed if resume=True
        - Fetch & persist detail pages up to max_listings
        """
        run = self.create_or_get_run(run_id=run_id if resume else None)
        limit = max_listings or self.config.max_listings

        try:
            # 1. Discovery from seed URL
            index_pages = [self.config.seed_url]
            discovered_detail_urls: List[str] = []
            seen_detail_urls = set()

            # If resuming, load URLs already in raw_listings
            if resume:
                existing_urls = {
                    r[0]
                    for r in self.db.query(RawListing.normalized_source_url)
                    .filter(RawListing.source_name == self.config.source_name)
                    .all()
                }
            else:
                existing_urls = set()

            current_page_idx = 0
            while current_page_idx < len(index_pages):
                if limit and len(discovered_detail_urls) >= limit:
                    break

                page_url = index_pages[current_page_idx]
                current_page_idx += 1

                try:
                    resp = self.collector.fetch(page_url)
                    detail_urls = TromoiSourceAdapter.discover_detail_urls(resp.text)
                    for d_url in detail_urls:
                        if d_url not in seen_detail_urls:
                            seen_detail_urls.add(d_url)
                            discovered_detail_urls.append(d_url)
                            run.discovered_count += 1
                            if limit and len(discovered_detail_urls) >= limit:
                                break

                    # Pagination discovery
                    if not self.config.page_limit or len(index_pages) < self.config.page_limit:
                        next_pages = TromoiSourceAdapter.discover_pagination_urls(resp.text, current_url=page_url)
                        for np in next_pages:
                            if np not in index_pages:
                                if not self.config.page_limit or len(index_pages) < self.config.page_limit:
                                    index_pages.append(np)

                except CollectorError as c_err:
                    self.record_error(
                        run,
                        stage="discovery",
                        error_code=c_err.error_code,
                        message=c_err.message,
                        source_url=page_url,
                        retryable=c_err.retryable,
                    )
                    if c_err.error_code == "HTTP_403_STOP":
                        break

            self.db.commit()

            # 2. Fetch and persist details
            for detail_url in discovered_detail_urls:
                if resume and detail_url in existing_urls:
                    continue

                if limit and run.fetched_count >= limit:
                    break

                success = self.process_detail_url(
                    url=detail_url,
                    run=run,
                    category_url=self.config.seed_url,
                    permission_status=permission_status,
                )

            run.status = "completed"
            run.finished_at = datetime.now(timezone.utc)
            self.db.commit()
            return run

        except Exception as exc:
            run.status = "failed"
            run.finished_at = datetime.now(timezone.utc)
            self.db.commit()
            raise
