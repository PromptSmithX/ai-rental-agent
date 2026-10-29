import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
# Import models so their tables register on Base before create_all.
import app.domain.models  # noqa: F401
import app.domain.ingestion_models  # noqa: F401
from app.domain.ingestion_models import RawListing, RawListingSnapshot
from app.domain.models import Room
from app.domain.enums import SourceKind
from app.etl.promote import promote_raw_to_rooms


@pytest.fixture
def etl_db():
    """Isolated in-memory DB (separate from the shared seeded test DB) so the
    destructive drop_demo path can't corrupt other suites."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def _make_listing(db, url, sid, payload):
    listing = RawListing(
        id=uuid.uuid4(), source_name="tromoi", normalized_source_url=url,
        source_listing_id=sid, scope_city="ha_noi",
    )
    db.add(listing)
    db.flush()
    snap = RawListingSnapshot(
        id=uuid.uuid4(), raw_listing_id=listing.id, captured_at=datetime.now(timezone.utc),
        content_sha256=uuid.uuid4().hex, payload=payload,
    )
    db.add(snap)
    db.flush()
    listing.latest_snapshot_id = snap.id
    db.flush()
    return listing


def _payload(sid, title, price, address_new=None, coords=None, desc=None, amenities=None):
    return {
        "source": {"source_listing_id": sid, "url": "u"},
        "listing": {"title_raw": title, "availability_raw": "Phòng trống: 2"},
        "pricing": {"header_price_raw": price},
        "location": {"address_new_raw": address_new, "source_coordinates": coords},
        "attributes": {"amenity_tags_raw": amenities or []},
        "content": {"description_text_raw": desc},
        "media": {"images": []},
    }


def test_promote_basic_drop_and_fields(etl_db):
    db = etl_db
    db.add(Room(id="demo-x", title="demo", price_monthly_vnd=1000000,
               address_label="demo addr", amenities=[], source_kind=SourceKind.DEMO.value))
    db.flush()

    _make_listing(db, "https://tromoi.com/phong-tro/good-100", "100", _payload(
        "100", "Phòng đẹp", "2.7 triệu/tháng", address_new="123 Giải Phóng, Hai Bà Trưng",
        coords={"lat": 21.0, "lng": 105.84, "evidence": "x", "precision_claim": "y"},
        desc="Phòng 25m2 có điều hòa, wifi", amenities=["Điều hòa"],
    ))
    _make_listing(db, "https://tromoi.com/phong-tro/noaddr-101", "101", _payload(
        "101", "Không địa chỉ", "2 triệu/tháng", address_new=None, coords=None))
    _make_listing(db, "https://tromoi.com/phong-tro/noprice-102", "102", _payload(
        "102", "Thỏa thuận", "Thỏa thuận/tháng", address_new="1 Đại Cồ Việt", coords=None))
    db.commit()

    stats = promote_raw_to_rooms(db, geocode=False, drop_demo=True, show_progress=False)

    assert stats.total == 3
    assert stats.promoted == 1
    assert stats.skipped_no_address == 1
    assert stats.skipped_no_price == 1
    assert stats.from_source_coords == 1
    assert stats.demo_removed == 1

    rooms = db.query(Room).all()
    assert len(rooms) == 1
    r = rooms[0]
    assert r.id == "tromoi-100"
    assert r.source_kind == SourceKind.CRAWLED.value
    assert r.is_simulated is False
    assert r.price_monthly_vnd == 2_700_000
    assert r.area_m2 == 25.0
    assert r.latitude == 21.0 and r.longitude == 105.84
    assert r.location_accuracy == "approximate"
    assert "air_conditioner" in r.amenities


def test_promote_idempotent(etl_db):
    db = etl_db
    _make_listing(db, "https://tromoi.com/phong-tro/good-200", "200", _payload(
        "200", "Phòng A", "3 triệu/tháng", address_new="50 Cầu Giấy",
        coords={"lat": 21.03, "lng": 105.79}))
    db.commit()

    promote_raw_to_rooms(db, geocode=False, drop_demo=False, show_progress=False)
    promote_raw_to_rooms(db, geocode=False, drop_demo=False, show_progress=False)
    assert db.query(Room).count() == 1
