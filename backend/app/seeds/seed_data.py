import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement

from app.domain.models import Campus, Room, RoomImage
from app.domain.enums import LocationAccuracy, ListingStatus, SourceKind


def create_svg_placeholder(title: str, color: str = "#0D9488") -> str:
    """Generate SVG placeholder identical to frontend fixture."""
    encoded_color = urllib.parse.quote(color)
    encoded_title = urllib.parse.quote(title)
    return (
        f"data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"600\" height=\"450\" viewBox=\"0 0 600 450\">"
        f"<rect width=\"600\" height=\"450\" fill=\"%23f1f5f9\"/>"
        f"<rect x=\"20\" y=\"20\" width=\"560\" height=\"410\" rx=\"12\" fill=\"%23ffffff\" stroke=\"%23cbd5e1\" stroke-width=\"2\"/>"
        f"<circle cx=\"300\" cy=\"180\" r=\"48\" fill=\"{encoded_color}\" opacity=\"0.15\"/>"
        f"<path d=\"M280 180 L320 180 M300 160 L300 200\" stroke=\"{encoded_color}\" stroke-width=\"4\" stroke-linecap=\"round\"/>"
        f"<text x=\"300\" y=\"260\" font-family=\"sans-serif\" font-size=\"18\" font-weight=\"600\" fill=\"%23334155\" text-anchor=\"middle\">{encoded_title}</text>"
        f"<text x=\"300\" y=\"290\" font-family=\"sans-serif\" font-size=\"13\" fill=\"%2364748b\" text-anchor=\"middle\">Ảnh minh họa mô phỏng (Demo)</text>"
        f"</svg>"
    )


CAMPUSES_DATA: List[Dict[str, Any]] = [
    {
        "id": "hcmut-ltk",
        "university_name": "Đại học Bách Khoa TP.HCM",
        "campus_name": "Cơ sở Lý Thường Kiệt (Quận 10)",
        "latitude": 10.7721,
        "longitude": 106.6579,
    },
    {
        "id": "hcmut-da",
        "university_name": "Đại học Bách Khoa TP.HCM",
        "campus_name": "Cơ sở Dĩ An (Đại học Quốc gia TP.HCM)",
        "latitude": 10.8805,
        "longitude": 106.8054,
    },
]

ROOMS_DATA: List[Dict[str, Any]] = [
    {
        "id": "demo-room-01",
        "title": "Phòng trọ ban công thoáng mát gần Bách Khoa",
        "price_monthly_vnd": 2800000,
        "area_m2": 22.0,
        "address_label": "Hẻm 497 Hòa Hảo, Phường 7, Quận 10, TP.HCM",
        "latitude": 10.7635,
        "longitude": 106.6625,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["air_conditioner", "wifi", "private_bathroom", "balcony", "parking"],
        "pet_allowed": True,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 10, 8, 30, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 350000,
        "images": [
            {"image_url": create_svg_placeholder("Phòng trọ 22m² - Lý Thường Kiệt", "#0D9488"), "caption": "Phòng ngủ"},
            {"image_url": create_svg_placeholder("Ban công & Cửa sổ lớn", "#0F766E"), "caption": "Ban công"},
        ],
    },
    {
        "id": "demo-room-02",
        "title": "Phòng studio full nội thất hẻm xe hơi Tô Hiến Thành",
        "price_monthly_vnd": 3200000,
        "area_m2": 26.0,
        "address_label": "286 Tô Hiến Thành, Phường 15, Quận 10, TP.HCM",
        "latitude": 10.7765,
        "longitude": 106.6628,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["air_conditioner", "wifi", "private_bathroom", "parking", "kitchen"],
        "pet_allowed": False,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 9, 14, 15, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 450000,
        "images": [
            {"image_url": create_svg_placeholder("Studio 26m² - Tô Hiến Thành", "#2563EB"), "caption": "Không gian chính"},
            {"image_url": create_svg_placeholder("Góc học tập & Bếp mini", "#1D4ED8"), "caption": "Bếp mini"},
        ],
    },
    {
        "id": "demo-room-03",
        "title": "Phòng gác lửng giá sinh viên gần cổng sau Bách Khoa",
        "price_monthly_vnd": 2300000,
        "area_m2": 18.0,
        "address_label": "Đường Lữ Gia, Phường 15, Quận 11, TP.HCM",
        "latitude": 10.7705,
        "longitude": 106.6540,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["wifi", "parking", "private_bathroom"],
        "pet_allowed": False,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 11, 2, 0, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 250000,
        "images": [
            {"image_url": create_svg_placeholder("Gác lửng 18m² - Lữ Gia", "#D97706"), "caption": "Gác lửng"},
        ],
    },
    {
        "id": "demo-room-04",
        "title": "Phòng ở ghép ký túc xá tư nhân sạch sẽ tiện nghi",
        "price_monthly_vnd": 1600000,
        "area_m2": 35.0,
        "address_label": "Thành Thái, Phường 14, Quận 10, TP.HCM",
        "latitude": 10.7712,
        "longitude": 106.6610,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["air_conditioner", "wifi", "parking", "kitchen"],
        "pet_allowed": False,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 8, 10, 0, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 150000,
        "images": [
            {"image_url": create_svg_placeholder("KTX cao cấp - Thành Thái", "#059669"), "caption": "Phòng ký túc xá"},
        ],
    },
    {
        "id": "demo-room-05",
        "title": "Phòng trọ có máy lạnh, giờ giấc tự do hẻm Ba Tháng Hai",
        "price_monthly_vnd": 2900000,
        "area_m2": 20.0,
        "address_label": "Đường 3 Tháng 2, Phường 14, Quận 10, TP.HCM",
        "latitude": 10.7675,
        "longitude": 106.6590,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["air_conditioner", "wifi", "private_bathroom", "parking"],
        "pet_allowed": True,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 10, 11, 20, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": None,
        "images": [
            {"image_url": create_svg_placeholder("Phòng 20m² - 3 Tháng 2", "#7C3AED"), "caption": "Phòng ngủ"},
        ],
    },
    {
        "id": "demo-room-06",
        "title": "Phòng trọ quận 10 giá tốt (chưa có tọa độ chính xác)",
        "price_monthly_vnd": 2400000,
        "area_m2": 19.0,
        "address_label": "Khu vực CMT8, Quận 10 (chưa rõ hẻm cụ thể)",
        "latitude": None,
        "longitude": None,
        "location_accuracy": LocationAccuracy.UNKNOWN.value,
        "amenities": ["wifi", "parking"],
        "pet_allowed": None,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 5, 9, 0, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": None,
        "images": [
            {"image_url": create_svg_placeholder("Phòng trọ Hẻm CMT8", "#64748B"), "caption": "Ảnh minh họa"},
        ],
    },
    {
        "id": "demo-room-07",
        "title": "Căn hộ dịch vụ cao cấp view Landmark gần Hoàng Văn Thụ",
        "price_monthly_vnd": 4800000,
        "area_m2": 32.0,
        "address_label": "Hoàng Văn Thụ, Phường 4, Tân Bình, TP.HCM",
        "latitude": 10.7930,
        "longitude": 106.6580,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["air_conditioner", "wifi", "private_bathroom", "balcony", "kitchen", "parking"],
        "pet_allowed": True,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 10, 16, 0, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 500000,
        "images": [
            {"image_url": create_svg_placeholder("CHDV 32m² cao cấp", "#DC2626"), "caption": "Tổng quan CHDV"},
        ],
    },
    {
        "id": "demo-room-08",
        "title": "Phòng trọ hẻm Lý Thường Kiệt không hình ảnh",
        "price_monthly_vnd": 2600000,
        "area_m2": None,
        "address_label": "Hẻm 266 Lý Thường Kiệt, Phường 14, Quận 10",
        "latitude": 10.7745,
        "longitude": 106.6585,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["wifi", "private_bathroom"],
        "pet_allowed": None,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 7, 12, 0, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 300000,
        "images": [],
    },
    {
        "id": "demo-room-09",
        "title": "Phòng trọ sinh viên gần Đại học Bách Khoa cơ sở Dĩ An",
        "price_monthly_vnd": 1800000,
        "area_m2": 24.0,
        "address_label": "Đường vành đai ĐHQG, Phường Đông Hòa, Dĩ An, Bình Dương",
        "latitude": 10.8835,
        "longitude": 106.8025,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["wifi", "private_bathroom", "parking"],
        "pet_allowed": True,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 10, 7, 15, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 200000,
        "images": [
            {"image_url": create_svg_placeholder("Phòng trọ Làng Đại Học Dĩ An", "#0D9488"), "caption": "Phòng trọ Dĩ An"},
        ],
    },
    {
        "id": "demo-room-10",
        "title": "Phòng mini máy lạnh cạnh cổng Bách Khoa Dĩ An",
        "price_monthly_vnd": 2200000,
        "area_m2": 20.0,
        "address_label": "Khu phố Tân Lập, Dĩ An, Bình Dương",
        "latitude": 10.8785,
        "longitude": 106.8080,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["air_conditioner", "wifi", "private_bathroom", "parking"],
        "pet_allowed": False,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 9, 18, 0, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 300000,
        "images": [
            {"image_url": create_svg_placeholder("Phòng có máy lạnh - KTX Bách Khoa DA", "#0284C7"), "caption": "Phòng máy lạnh"},
        ],
    },
    {
        "id": "demo-room-11",
        "title": "Phòng trọ xa trường Bách Khoa LTK (Quận Tân Phú)",
        "price_monthly_vnd": 2100000,
        "area_m2": 20.0,
        "address_label": "Đường Lũy Bán Bích, Tân Phú, TP.HCM",
        "latitude": 10.7780,
        "longitude": 106.6250,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["air_conditioner", "wifi"],
        "pet_allowed": True,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 6, 10, 0, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 250000,
        "images": [
            {"image_url": create_svg_placeholder("Phòng trọ Tân Phú", "#64748B"), "caption": "Phòng trọ Tân Phú"},
        ],
    },
    {
        "id": "demo-room-12",
        "title": "Phòng trọ nữ có máy lạnh, bếp riêng Lữ Gia",
        "price_monthly_vnd": 2700000,
        "area_m2": 21.0,
        "address_label": "Hẻm 70 Lữ Gia, Phường 15, Quận 11, TP.HCM",
        "latitude": 10.7718,
        "longitude": 106.6532,
        "location_accuracy": LocationAccuracy.APPROXIMATE.value,
        "amenities": ["air_conditioner", "wifi", "private_bathroom", "kitchen", "parking"],
        "pet_allowed": False,
        "listing_status": ListingStatus.UNKNOWN.value,
        "source_kind": SourceKind.DEMO.value,
        "source_url": None,
        "last_checked_at": datetime(2026, 10, 11, 5, 40, tzinfo=timezone.utc),
        "utilities_monthly_estimate_vnd": 320000,
        "images": [
            {"image_url": create_svg_placeholder("Phòng bếp riêng Lữ Gia", "#EC4899"), "caption": "Bếp riêng"},
        ],
    },
]


def seed_database(db: Session) -> None:
    """Populate database with demo campuses and rooms."""
    is_postgres = db.bind.dialect.name == "postgresql"

    # 1. Seed campuses
    for c_data in CAMPUSES_DATA:
        existing = db.query(Campus).filter(Campus.id == c_data["id"]).first()
        geom = (
            WKTElement(f"POINT({c_data['longitude']} {c_data['latitude']})", srid=4326)
            if is_postgres
            else None
        )
        if not existing:
            campus = Campus(
                id=c_data["id"],
                university_name=c_data["university_name"],
                campus_name=c_data["campus_name"],
                latitude=c_data["latitude"],
                longitude=c_data["longitude"],
                geom=geom,
            )
            db.add(campus)
        else:
            existing.university_name = c_data["university_name"]
            existing.campus_name = c_data["campus_name"]
            existing.latitude = c_data["latitude"]
            existing.longitude = c_data["longitude"]
            if is_postgres:
                existing.geom = geom

    db.commit()

    # 2. Seed rooms and room images
    for r_data in ROOMS_DATA:
        existing_room = db.query(Room).filter(Room.id == r_data["id"]).first()
        geom = None
        if is_postgres and r_data["latitude"] is not None and r_data["longitude"] is not None:
            geom = WKTElement(
                f"POINT({r_data['longitude']} {r_data['latitude']})", srid=4326
            )

        images_data = r_data.get("images", [])

        if not existing_room:
            room = Room(
                id=r_data["id"],
                title=r_data["title"],
                price_monthly_vnd=r_data["price_monthly_vnd"],
                area_m2=r_data["area_m2"],
                address_label=r_data["address_label"],
                latitude=r_data["latitude"],
                longitude=r_data["longitude"],
                geom=geom,
                location_accuracy=r_data["location_accuracy"],
                amenities=r_data["amenities"],
                pet_allowed=r_data["pet_allowed"],
                listing_status=r_data["listing_status"],
                source_kind=r_data["source_kind"],
                source_url=r_data["source_url"],
                last_checked_at=r_data["last_checked_at"],
                utilities_monthly_estimate_vnd=r_data["utilities_monthly_estimate_vnd"],
                is_simulated=True,
            )
            db.add(room)
            db.flush()

            for idx, img in enumerate(images_data):
                room_image = RoomImage(
                    room_id=room.id,
                    image_url=img["image_url"],
                    caption=img.get("caption"),
                    display_order=idx,
                )
                db.add(room_image)
        else:
            # Update existing room
            existing_room.title = r_data["title"]
            existing_room.price_monthly_vnd = r_data["price_monthly_vnd"]
            existing_room.area_m2 = r_data["area_m2"]
            existing_room.address_label = r_data["address_label"]
            existing_room.latitude = r_data["latitude"]
            existing_room.longitude = r_data["longitude"]
            if is_postgres:
                existing_room.geom = geom
            existing_room.location_accuracy = r_data["location_accuracy"]
            existing_room.amenities = r_data["amenities"]
            existing_room.pet_allowed = r_data["pet_allowed"]
            existing_room.listing_status = r_data["listing_status"]
            existing_room.source_kind = r_data["source_kind"]
            existing_room.source_url = r_data["source_url"]
            existing_room.last_checked_at = r_data["last_checked_at"]
            existing_room.utilities_monthly_estimate_vnd = r_data["utilities_monthly_estimate_vnd"]
            existing_room.is_simulated = True

            # Refresh images
            db.query(RoomImage).filter(RoomImage.room_id == existing_room.id).delete()
            for idx, img in enumerate(images_data):
                room_image = RoomImage(
                    room_id=existing_room.id,
                    image_url=img["image_url"],
                    caption=img.get("caption"),
                    display_order=idx,
                )
                db.add(room_image)

    db.commit()


if __name__ == "__main__":
    from app.database import SessionLocal, Base, engine
    print("Creating tables if not exist...")
    Base.metadata.create_all(bind=engine)
    print("Seeding database...")
    db = SessionLocal()
    try:
        seed_database(db)
        print("Database seeded successfully with demo fixtures.")
    finally:
        db.close()
