from app.domain.enums import Amenity, ListingStatus
from app.etl import normalizers as nz


def test_parse_price_trieu_with_month_suffix():
    assert nz.parse_price_vnd("2.7 triệu/tháng") == 2_700_000
    assert nz.parse_price_vnd("1.2 triệu/tháng") == 1_200_000
    assert nz.parse_price_vnd("5 triệu") == 5_000_000


def test_parse_price_thousand_and_plain():
    assert nz.parse_price_vnd("500 nghìn") == 500_000
    assert nz.parse_price_vnd("800k") == 800_000
    assert nz.parse_price_vnd("3.000.000đ") == 3_000_000
    assert nz.parse_price_vnd("3,500,000 vnd") == 3_500_000


def test_parse_price_negotiable_or_empty():
    assert nz.parse_price_vnd("Thỏa thuận/tháng") is None
    assert nz.parse_price_vnd("") is None
    assert nz.parse_price_vnd(None) is None
    # Garbage tiny number is rejected
    assert nz.parse_price_vnd("12") is None


def test_parse_area_from_description():
    assert nz.parse_area_m2("Phòng rộng 25m2, có gác") == 25.0
    assert nz.parse_area_m2("diện tích 30,5 m² thoáng mát") == 30.5
    assert nz.parse_area_m2("không nói diện tích") is None
    # Implausible values filtered out
    assert nz.parse_area_m2("giá chỉ 2000 m2 đất nền") is None


def test_map_amenities():
    found = nz.map_amenities(
        amenity_tags=["Điều hòa", "Wifi miễn phí", "Gửi xe"],
        description="nhà vệ sinh khép kín, có ban công, bếp riêng",
    )
    assert Amenity.AIR_CONDITIONER in found
    assert Amenity.WIFI in found
    assert Amenity.PARKING in found
    assert Amenity.PRIVATE_BATHROOM in found
    assert Amenity.BALCONY in found
    assert Amenity.KITCHEN in found


def test_parse_pet_allowed():
    assert nz.parse_pet_allowed(description="được nuôi thú cưng") is True
    assert nz.parse_pet_allowed(description="không nuôi chó mèo") is False
    assert nz.parse_pet_allowed(description="phòng sạch sẽ") is None


def test_parse_listing_status():
    assert nz.parse_listing_status("Phòng trống: 3") == ListingStatus.AVAILABLE
    assert nz.parse_listing_status("Phòng trống: 0") == ListingStatus.UNAVAILABLE
    assert nz.parse_listing_status(None) == ListingStatus.UNKNOWN


def test_build_address_label_fallback():
    assert nz.build_address_label({"address_new_raw": "123 Giải Phóng"}) == "123 Giải Phóng"
    assert nz.build_address_label({"address_old_raw": "Số 5 ngõ 2"}) == "Số 5 ngõ 2"
    assert nz.build_address_label({"address_description_raw": "gần chợ"}) == "gần chợ"
    assert nz.build_address_label({"address_new_raw": "  "}) is None
    assert nz.build_address_label({}) is None
