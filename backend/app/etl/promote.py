"""Promote crawled raw listings into canonical Room rows served by the app.

Reads the latest snapshot of each RawListing, normalizes it (price/area/amenities/
address/status), resolves coordinates (source embed else geocode), and upserts a
Room. Listings without a usable address or numeric price are dropped. Idempotent:
re-running updates the same Room ids instead of duplicating.
"""
import argparse
import hashlib
import sys
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.domain.enums import LocationAccuracy, SourceKind
from app.domain.ingestion_models import RawListing, RawListingSnapshot
from app.domain.models import Room, RoomImage
from app.etl import normalizers as nz
from app.etl.campuses_hanoi import seed_hanoi_campuses
from app.etl.geocode import Geocoder

try:
    from tqdm import tqdm
except ImportError:  # pragma: no cover
    tqdm = None


@dataclass
class PromoteStats:
    total: int = 0
    promoted: int = 0
    skipped_no_address: int = 0
    skipped_no_price: int = 0
    from_source_coords: int = 0
    geocoded: int = 0
    no_coords: int = 0
    demo_removed: int = 0

    def as_dict(self) -> Dict[str, int]:
        return self.__dict__.copy()


def _room_id(payload: Dict[str, Any], normalized_url: str) -> str:
    source = payload.get("source", {})
    sid = source.get("source_listing_id")
    if sid:
        return f"tromoi-{sid}"
    digest = hashlib.sha256(normalized_url.encode("utf-8")).hexdigest()[:12]
    return f"tromoi-{digest}"


def _wkt(lat: float, lng: float):
    from geoalchemy2.elements import WKTElement

    return WKTElement(f"POINT({lng} {lat})", srid=4326)


def promote_raw_to_rooms(
    db: Session,
    geocode: bool = True,
    drop_demo: bool = True,
    with_images: bool = False,
    limit: Optional[int] = None,
    show_progress: bool = True,
) -> PromoteStats:
    stats = PromoteStats()
    is_postgres = db.bind.dialect.name == "postgresql"
    geocoder = Geocoder(enabled=geocode)

    # Latest snapshot per listing.
    rows = (
        db.query(RawListing, RawListingSnapshot)
        .join(RawListingSnapshot, RawListingSnapshot.id == RawListing.latest_snapshot_id)
        .all()
    )
    if limit:
        rows = rows[:limit]
    stats.total = len(rows)

    iterator = rows
    if show_progress and tqdm is not None:
        iterator = tqdm(rows, desc="Promote raw→Room", unit="tin")

    try:
        for listing, snap in iterator:
            payload: Dict[str, Any] = snap.payload or {}
            location = payload.get("location", {}) or {}
            pricing = payload.get("pricing", {}) or {}
            attributes = payload.get("attributes", {}) or {}
            content = payload.get("content", {}) or {}
            listing_info = payload.get("listing", {}) or {}
            media = payload.get("media", {}) or {}

            address = nz.build_address_label(location)
            if not address:
                stats.skipped_no_address += 1
                continue

            price = nz.parse_price_vnd(pricing.get("header_price_raw"))
            if price is None:
                stats.skipped_no_price += 1
                continue

            description = content.get("description_text_raw")
            area = nz.parse_area_m2(description)
            amenities = [a.value for a in nz.map_amenities(
                attributes.get("amenity_tags_raw"),
                attributes.get("target_tenants_raw"),
                description,
            )]
            pet = nz.parse_pet_allowed(
                attributes.get("amenity_tags_raw"),
                attributes.get("target_tenants_raw"),
                description,
            )
            status = nz.parse_listing_status(listing_info.get("availability_raw"))

            # Coordinates: source embed first, else geocode the address.
            lat = lng = None
            accuracy = LocationAccuracy.UNKNOWN
            src_coords = location.get("source_coordinates")
            if src_coords and src_coords.get("lat") is not None and src_coords.get("lng") is not None:
                lat, lng = src_coords["lat"], src_coords["lng"]
                accuracy = LocationAccuracy.APPROXIMATE
                stats.from_source_coords += 1
            else:
                geo = geocoder.geocode(address)
                if geo:
                    lat, lng = geo
                    accuracy = LocationAccuracy.APPROXIMATE
                    stats.geocoded += 1
                else:
                    stats.no_coords += 1

            normalized_url = listing.normalized_source_url
            rid = _room_id(payload, normalized_url)
            geom = _wkt(lat, lng) if (is_postgres and lat is not None and lng is not None) else None

            room = db.query(Room).filter(Room.id == rid).first()
            if room is None:
                room = Room(id=rid)
                db.add(room)

            room.title = (listing_info.get("title_raw") or address)[:255]
            room.price_monthly_vnd = price
            room.area_m2 = area
            room.address_label = address[:500]
            room.latitude = lat
            room.longitude = lng
            if is_postgres:
                room.geom = geom
            room.location_accuracy = accuracy.value
            room.amenities = amenities
            room.pet_allowed = pet
            room.listing_status = status.value
            room.source_kind = SourceKind.CRAWLED.value
            room.source_url = normalized_url
            room.last_checked_at = snap.captured_at
            room.utilities_monthly_estimate_vnd = None
            room.is_simulated = False
            db.flush()

            if with_images:
                db.query(RoomImage).filter(RoomImage.room_id == rid).delete()
                for idx, img in enumerate(media.get("images", []) or []):
                    url = img.get("source_url")
                    if url:
                        db.add(RoomImage(room_id=rid, image_url=url, display_order=idx))

            stats.promoted += 1

        if drop_demo:
            stats.demo_removed = (
                db.query(Room).filter(Room.source_kind == SourceKind.DEMO.value).delete()
            )

        db.commit()
    finally:
        geocoder.close()

    return stats


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="ETL: promote crawled raw listings into Room rows")
    parser.add_argument("--no-geocode", action="store_true", help="Skip geocoding (only source-embed coords)")
    parser.add_argument("--keep-demo", action="store_true", help="Keep existing demo rooms")
    parser.add_argument("--with-images", action="store_true", help="Import source image URLs (third-party rights caveat)")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N listings")
    parser.add_argument("--seed-campuses", action="store_true", help="Also upsert Hà Nội campuses")
    parser.add_argument("--quiet", action="store_true", help="Disable progress bar")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.seed_campuses:
            n = seed_hanoi_campuses(db)
            print(f"Seeded/updated {n} Hà Nội campuses.")

        stats = promote_raw_to_rooms(
            db,
            geocode=not args.no_geocode,
            drop_demo=not args.keep_demo,
            with_images=args.with_images,
            limit=args.limit,
            show_progress=not args.quiet,
        )
        print("\nETL promote finished:")
        for k, v in stats.as_dict().items():
            print(f"- {k}: {v}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
