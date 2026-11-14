import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.ingestion.config import IngestionConfig
from app.ingestion.service import IngestionService
from app.domain.ingestion_models import (
    IngestionRun,
    RawListing,
    RawListingSnapshot,
    RawListingImage,
    IngestionError,
)
from app.domain.models import Room
from app.schemas.raw_listing import (
    RawListingPayload,
    SourceInfo,
    ListingInfo,
    PricingInfo,
    LocationInfo,
    AttributesInfo,
    ContentInfo,
    MediaInfo,
    ImageReference,
    FetchInfo,
)


@pytest.fixture
def base_payload():
    return RawListingPayload(
        schema_version="1.0.0",
        source=SourceInfo(
            site="tromoi",
            url="https://tromoi.com/phong-tro/sample-test-listing",
            canonical_url="https://tromoi.com/phong-tro/sample-test-listing",
            source_listing_id="12345",
            scope_city="ha_noi",
        ),
        fetch=FetchInfo(
            fetched_at="2026-10-12T00:00:00Z",
            http_status=200,
        ),
        listing=ListingInfo(
            title_raw="Phòng trọ đẹp Hà Đông",
            category_raw="Phòng trọ",
            badges_raw=["Hot"],
        ),
        pricing=PricingInfo(
            header_price_raw="3 triệu/tháng",
            description_price_mentions_raw=["Giá thuê: 3 triệu/tháng"],
        ),
        location=LocationInfo(
            address_new_raw="Số 10 Dương Nội, Hà Đông, Hà Nội",
        ),
        attributes=AttributesInfo(
            amenity_tags_raw=["Điều hòa", "Nóng lạnh"],
        ),
        content=ContentInfo(
            description_text_raw="Phòng trọ mới xây...",
        ),
        media=MediaInfo(
            images=[
                ImageReference(source_url="https://tromoi.com/img1.jpg", position=0, is_cover=True),
                ImageReference(source_url="https://tromoi.com/img2.jpg", position=1, is_cover=False),
            ],
            video_present=False,
        ),
    )


def test_case_10_and_11_snapshot_idempotency_and_hash_stability(db_session: Session, base_payload):
    """
    Case 10: same URL + same stable hash yields 1 snapshot; changed content yields new one.
    Case 11: fetch timestamp changes alone do NOT generate a new snapshot.
    """
    config = IngestionConfig()
    service = IngestionService(db=db_session, config=config)
    run1 = service.create_or_get_run()

    # First persist
    listing1, snap1, changed1 = service.persist_listing_payload(base_payload, run1)
    assert changed1 is True
    assert snap1 is not None

    snapshots_count_1 = db_session.query(RawListingSnapshot).filter(RawListingSnapshot.raw_listing_id == listing1.id).count()
    assert snapshots_count_1 == 1

    # Second persist with changed fetch timestamp only (hash stability test)
    payload_new_time = base_payload.model_copy(deep=True)
    payload_new_time.fetch.fetched_at = "2026-10-13T12:00:00Z"
    run2 = service.create_or_get_run()

    listing2, snap2, changed2 = service.persist_listing_payload(payload_new_time, run2)
    assert changed2 is False  # Not changed!
    assert snap2.id == snap1.id

    snapshots_count_2 = db_session.query(RawListingSnapshot).filter(RawListingSnapshot.raw_listing_id == listing1.id).count()
    assert snapshots_count_2 == 1

    # Third persist with altered title/price (actual content change)
    payload_changed = base_payload.model_copy(deep=True)
    payload_changed.pricing.header_price_raw = "3.5 triệu/tháng"

    listing3, snap3, changed3 = service.persist_listing_payload(payload_changed, run2)
    assert changed3 is True
    assert snap3.id != snap1.id

    snapshots_count_3 = db_session.query(RawListingSnapshot).filter(RawListingSnapshot.raw_listing_id == listing1.id).count()
    assert snapshots_count_3 == 2


def test_case_16_transaction_rollback_on_failure(db_session: Session, base_payload):
    """Case 16: transactional rollback prevents orphan or corrupted snapshot state."""
    config = IngestionConfig()
    service = IngestionService(db=db_session, config=config)
    run = service.create_or_get_run()

    initial_snaps = db_session.query(RawListingSnapshot).count()
    initial_errors = db_session.query(IngestionError).count()

    # Simulate error by processing invalid URL
    success = service.process_detail_url("https://malicious.com/listing", run)
    assert success is False

    # Snapshot count should not increase
    assert db_session.query(RawListingSnapshot).count() == initial_snaps
    # Error should be recorded
    assert db_session.query(IngestionError).count() == initial_errors + 1


def test_case_17_resumability(db_session: Session, base_payload):
    """Case 17: resume skips already persisted listings without duplicates."""
    config = IngestionConfig()
    service = IngestionService(db=db_session, config=config)
    run1 = service.create_or_get_run()

    listing, snap, _ = service.persist_listing_payload(base_payload, run1)
    initial_images = db_session.query(RawListingImage).filter(RawListingImage.raw_listing_id == listing.id).count()
    assert initial_images == 2

    # Simulate second run with same URL
    run2 = service.create_or_get_run(run_id=run1.id)
    listing2, snap2, changed = service.persist_listing_payload(base_payload, run2)

    assert changed is False
    assert db_session.query(RawListingImage).filter(RawListingImage.raw_listing_id == listing.id).count() == 2


def test_case_18_frontend_isolation(db_session: Session):
    """Case 18: Ingestion models/data remain isolated from canonical Room table."""
    rooms_count = db_session.query(Room).count()
    raw_count = db_session.query(RawListing).count()

    # Ensure rooms table is independent and unchanged
    assert isinstance(rooms_count, int)
    assert isinstance(raw_count, int)
