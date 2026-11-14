"""Seed the Hà Nội campuses the MVP searches around.

IDs match what the agent's extractor emits (hust-hanoi / vnu-hanoi / neu-hanoi).
Coordinates are well-known approximate campus centroids — verify/refine as needed.
"""
from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.domain.models import Campus

HANOI_CAMPUSES: List[Dict[str, Any]] = [
    {
        "id": "hust-hanoi",
        "university_name": "Đại học Bách Khoa Hà Nội",
        "campus_name": "Cơ sở Hai Bà Trưng",
        "latitude": 21.0045,
        "longitude": 105.8412,
    },
    {
        "id": "vnu-hanoi",
        "university_name": "Đại học Quốc gia Hà Nội",
        "campus_name": "Cơ sở Xuân Thủy (Cầu Giấy)",
        "latitude": 21.0376,
        "longitude": 105.7825,
    },
    {
        "id": "neu-hanoi",
        "university_name": "Đại học Kinh tế Quốc dân",
        "campus_name": "Cơ sở Giải Phóng (Hai Bà Trưng)",
        "latitude": 20.9995,
        "longitude": 105.8440,
    },
]


def seed_hanoi_campuses(db: Session) -> int:
    """Upsert Hà Nội campuses. Returns number of rows written."""
    is_postgres = db.bind.dialect.name == "postgresql"
    geom_factory = None
    if is_postgres:
        from geoalchemy2.elements import WKTElement

        def geom_factory(lat: float, lng: float):  # noqa: E306
            return WKTElement(f"POINT({lng} {lat})", srid=4326)

    count = 0
    for c in HANOI_CAMPUSES:
        geom = geom_factory(c["latitude"], c["longitude"]) if geom_factory else None
        existing = db.query(Campus).filter(Campus.id == c["id"]).first()
        if existing:
            existing.university_name = c["university_name"]
            existing.campus_name = c["campus_name"]
            existing.latitude = c["latitude"]
            existing.longitude = c["longitude"]
            if geom is not None:
                existing.geom = geom
        else:
            db.add(Campus(
                id=c["id"],
                university_name=c["university_name"],
                campus_name=c["campus_name"],
                latitude=c["latitude"],
                longitude=c["longitude"],
                geom=geom,
            ))
        count += 1
    db.commit()
    return count
