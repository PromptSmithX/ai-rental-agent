import os
import json
import tempfile
import pytest
from sqlalchemy.orm import Session
from app.ingestion.config import IngestionConfig
from app.ingestion.service import IngestionService
from app.ingestion.profiling import DataProfiler
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
    CaptureInfo,
)


def test_profiler_reports_generation(db_session: Session):
    with tempfile.TemporaryDirectory() as tmp_dir:
        output_dir = os.path.join(tmp_dir, "reports")
        config = IngestionConfig()
        service = IngestionService(db=db_session, config=config)
        run = service.create_or_get_run()

    # Create listing with price conflict
    p1 = RawListingPayload(
        schema_version="1.0.0",
        source=SourceInfo(url="https://tromoi.com/p1", site="tromoi", scope_city="ha_noi"),
        listing=ListingInfo(title_raw="Phòng trọ 1"),
        pricing=PricingInfo(header_price_raw="2.5 triệu/tháng", description_price_mentions_raw=["Giá 3 triệu/tháng"]),
        location=LocationInfo(address_new_raw="Số 1 Cầu Giấy, Hà Nội"),
        content=ContentInfo(description_text_raw="Mô tả..."),
        media=MediaInfo(images=[ImageReference(source_url="https://tromoi.com/img1.jpg", position=0, is_cover=True)]),
        capture=CaptureInfo(warnings=["price_mentions_conflict"]),
    )
    service.persist_listing_payload(p1, run)

    # Create listing with missing header_price
    p2 = RawListingPayload(
        schema_version="1.0.0",
        source=SourceInfo(url="https://tromoi.com/p2", site="tromoi", scope_city="ha_noi"),
        listing=ListingInfo(title_raw="Phòng trọ 2"),
        pricing=PricingInfo(),
        location=LocationInfo(address_new_raw="Số 2 Cầu Giấy, Hà Nội"),
        content=ContentInfo(description_text_raw="Mô tả..."),
    )
    service.persist_listing_payload(p2, run)

    profiler = DataProfiler(db=db_session, output_dir=output_dir)
    summary = profiler.generate_all_reports(run_id=str(run.id))

    assert summary["total_snapshots"] == 2
    assert summary["price_conflicts_count"] >= 1
    assert summary["missing_fields_count"] >= 1

    expected_files = [
        "crawl_summary.json",
        "field_coverage.csv",
        "price_conflicts.csv",
        "missing_fields.csv",
        "image_coverage.csv",
        "geo_coverage.csv",
        "duplicate_candidates.csv",
        "errors.csv",
    ]
    for ef in expected_files:
        assert os.path.exists(os.path.join(output_dir, ef))

    with open(os.path.join(output_dir, "crawl_summary.json"), encoding="utf-8") as f:
        data = json.load(f)
        assert data["total_snapshots"] == 2
