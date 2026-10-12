import os
import pytest
from app.ingestion.adapters.tromoi import (
    TromoiSourceAdapter,
    normalize_url,
    compute_content_sha256,
    is_hanoi_location,
)
from app.schemas.raw_listing import RawListingPayload


FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "tromoi_detail_sample.html")


@pytest.fixture
def sample_detail_html():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return f.read()


def test_parse_sample_detail_fixture(sample_detail_html):
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=sample_detail_html,
        source_url="https://tromoi.com/phong-tro/phong-tro-moi-100-full-noi-that-khu-duong-noi-ha-dong",
    )
    assert isinstance(payload, RawListingPayload)
    assert payload.schema_version == "1.0.0"
    assert "Dương Nội" in payload.listing.title_raw
    assert payload.listing.category_raw == "Phòng trọ"
    assert "Hot" in payload.listing.badges_raw
    assert payload.listing.posted_date_raw == "25-09-2026"
    assert payload.listing.availability_raw == "Liên hệ chủ trọ"
    assert payload.listing.units_count_raw == "1"


def test_case_01_dual_prices(sample_detail_html):
    """Case 1: heading 2.7m, description 3m -> both retained, price conflict warning."""
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=sample_detail_html,
        source_url="https://tromoi.com/phong-tro/sample-dual-price",
    )
    assert payload.pricing.header_price_raw == "2.7 triệu/tháng"
    assert any("3 triệu/tháng" in mention for mention in payload.pricing.description_price_mentions_raw)
    assert "price_mentions_conflict" in payload.capture.warnings


def test_case_02_new_old_address(sample_detail_html):
    """Case 2: both new and old address exact strings retained."""
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=sample_detail_html,
        source_url="https://tromoi.com/phong-tro/sample-address",
    )
    assert "Phường Dương Nội, Thành phố Hà Nội" in payload.location.address_new_raw
    assert "Hà Đông, Hà Nội" in payload.location.address_old_raw
    assert "Số 27" in payload.location.address_description_raw


def test_case_03_amenity_gap():
    """Case 3: 'Điều hòa' mentioned in description without tag is NOT auto-added to amenity tags."""
    minimal_html = """
    <html>
      <body>
        <h1>Phòng trọ Cầu Giấy</h1>
        <div class="content-detail">Phòng đẹp có Điều hòa mát lạnh.</div>
        <div class="hostel__detail--block">
          <h3>Tiện nghi</h3>
          <div class="item__label">Wifi</div>
        </div>
      </body>
    </html>
    """
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=minimal_html,
        source_url="https://tromoi.com/phong-tro/sample-gap",
    )
    assert "Wifi" in payload.attributes.amenity_tags_raw
    assert "Điều hòa" not in payload.attributes.amenity_tags_raw
    assert "Điều hòa" in payload.content.description_text_raw


def test_case_04_unknown_negative():
    """Case 4: missing pet tag/text remains absent/unknown, never coerced to false."""
    minimal_html = "<html><body><h1>Phòng trọ</h1></body></html>"
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=minimal_html,
        source_url="https://tromoi.com/phong-tro/sample-negative",
    )
    assert payload.attributes.amenity_tags_raw == []
    # No boolean pet_allowed coerced to False in raw schema
    assert not hasattr(payload.attributes, "pet_allowed")


def test_case_05_area_range(sample_detail_html):
    """Case 5: '20–25m²' retained as raw text in description, not forced to scalar 20 or 25."""
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=sample_detail_html,
        source_url="https://tromoi.com/phong-tro/sample-area",
    )
    assert "20–25m²" in payload.content.description_text_raw


def test_case_06_fees(sample_detail_html):
    """Case 6: electricity, water, waste found as source fee strings."""
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=sample_detail_html,
        source_url="https://tromoi.com/phong-tro/sample-fees",
    )
    fees_str = " ".join(payload.pricing.fee_mentions_raw)
    assert "Điện 4.000đ/số" in fees_str
    assert "Nước 30.000đ/m³" in fees_str
    assert "rác/vệ sinh" in fees_str


def test_case_07_gallery_and_video(sample_detail_html):
    """Case 7: gallery order and cover preserved, deduplicated URLs, video metadata only."""
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=sample_detail_html,
        source_url="https://tromoi.com/phong-tro/sample-gallery",
    )
    images = payload.media.images
    assert len(images) > 0
    assert images[0].is_cover is True
    # Verify no duplicate URLs in images
    urls = [img.source_url for img in images]
    assert len(urls) == len(set(urls))
    # Video metadata present, no video file downloaded
    assert payload.media.video_present is True


def test_case_08_optional_data():
    """Case 8: missing date/images/map/area yields nullable/empty schema-valid record."""
    empty_html = "<html><body><h1>Minimal Listing</h1></body></html>"
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=empty_html,
        source_url="https://tromoi.com/phong-tro/sample-empty",
    )
    assert payload.listing.title_raw == "Minimal Listing"
    assert payload.listing.posted_date_raw is None
    assert payload.pricing.header_price_raw is None
    assert payload.location.address_new_raw is None
    assert payload.media.images == []
    assert payload.location.source_coordinates is None


def test_case_09_source_scope():
    """Case 9: non-Hanoi detail flagged with warning."""
    hcm_html = """
    <html>
      <body>
        <h1>Cho thuê phòng trọ Quận 1 TP.HCM</h1>
        <div class="box-address--new">123 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP Hồ Chí Minh</div>
      </body>
    </html>
    """
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=hcm_html,
        source_url="https://tromoi.com/phong-tro/sample-hcm",
    )
    assert "listing_outside_hanoi_scope" in payload.capture.warnings


def test_case_15_privacy_contact_redaction(sample_detail_html):
    """Case 15: landlord name and phone number not persisted in normal fields."""
    payload = TromoiSourceAdapter.parse_detail_page(
        html_content=sample_detail_html,
        source_url="https://tromoi.com/phong-tro/sample-privacy",
    )
    dumped = payload.model_dump_json()
    # Ensure phone number found in sidebar is not in listing payload
    assert "0385286189" not in dumped
    assert "contact_details_intentionally_excluded" in payload.capture.warnings
