import os
import csv
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

import uuid
from app.domain.ingestion_models import (
    IngestionRun,
    RawListing,
    RawListingSnapshot,
    RawListingImage,
    IngestionError,
)


class DataProfiler:
    """Generates data quality profiling reports and metrics."""

    def __init__(self, db: Session, output_dir: str = "reports"):
        self.db = db
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_all_reports(self, run_id: Optional[Any] = None) -> Dict[str, Any]:
        """Generate all required CSV and JSON reports."""
        run_uuid = None
        if run_id:
            run_uuid = uuid.UUID(str(run_id)) if not isinstance(run_id, uuid.UUID) else run_id

        query = self.db.query(RawListingSnapshot)
        if run_uuid:
            query = query.filter(RawListingSnapshot.run_id == run_uuid)

        snapshots = query.all()
        total_snapshots = len(snapshots)

        field_counts = {
            "title_raw": 0,
            "category_raw": 0,
            "posted_date_raw": 0,
            "availability_raw": 0,
            "units_count_raw": 0,
            "header_price_raw": 0,
            "description_price_mentions_raw": 0,
            "fee_mentions_raw": 0,
            "address_new_raw": 0,
            "address_old_raw": 0,
            "address_description_raw": 0,
            "map_href_raw": 0,
            "source_coordinates": 0,
            "amenity_tags_raw": 0,
            "target_tenants_raw": 0,
            "surroundings_tags_raw": 0,
            "description_text_raw": 0,
            "images": 0,
            "video_present": 0,
        }

        price_conflicts = []
        missing_fields = []
        geo_coverage = []
        image_coverage = []
        title_map = {}
        address_map = {}
        duplicate_candidates = []

        for snap in snapshots:
            p = snap.payload
            listing = p.get("listing", {})
            pricing = p.get("pricing", {})
            location = p.get("location", {})
            attributes = p.get("attributes", {})
            content = p.get("content", {})
            media = p.get("media", {})
            capture = p.get("capture", {})
            source = p.get("source", {})

            url = source.get("url", "")
            title = listing.get("title_raw") or ""
            addr_new = location.get("address_new_raw") or ""

            # Completeness counters
            if title: field_counts["title_raw"] += 1
            if listing.get("category_raw"): field_counts["category_raw"] += 1
            if listing.get("posted_date_raw"): field_counts["posted_date_raw"] += 1
            if listing.get("availability_raw"): field_counts["availability_raw"] += 1
            if listing.get("units_count_raw"): field_counts["units_count_raw"] += 1
            if pricing.get("header_price_raw"): field_counts["header_price_raw"] += 1
            if pricing.get("description_price_mentions_raw"): field_counts["description_price_mentions_raw"] += 1
            if pricing.get("fee_mentions_raw"): field_counts["fee_mentions_raw"] += 1
            if addr_new: field_counts["address_new_raw"] += 1
            if location.get("address_old_raw"): field_counts["address_old_raw"] += 1
            if location.get("address_description_raw"): field_counts["address_description_raw"] += 1
            if location.get("map_href_raw"): field_counts["map_href_raw"] += 1
            if location.get("source_coordinates"): field_counts["source_coordinates"] += 1
            if attributes.get("amenity_tags_raw"): field_counts["amenity_tags_raw"] += 1
            if attributes.get("target_tenants_raw"): field_counts["target_tenants_raw"] += 1
            if attributes.get("surroundings_tags_raw"): field_counts["surroundings_tags_raw"] += 1
            if content.get("description_text_raw"): field_counts["description_text_raw"] += 1
            images_list = media.get("images", [])
            if images_list: field_counts["images"] += 1
            if media.get("video_present"): field_counts["video_present"] += 1

            # Price conflicts
            warnings = capture.get("warnings", [])
            if "price_mentions_conflict" in warnings or (
                pricing.get("header_price_raw") and pricing.get("description_price_mentions_raw")
            ):
                price_conflicts.append({
                    "snapshot_id": str(snap.id),
                    "url": url,
                    "header_price": pricing.get("header_price_raw"),
                    "description_prices": " | ".join(pricing.get("description_price_mentions_raw") or []),
                    "has_conflict_warning": "price_mentions_conflict" in warnings,
                })

            # Missing key fields
            missing = []
            if not title: missing.append("title")
            if not pricing.get("header_price_raw"): missing.append("header_price")
            if not addr_new: missing.append("address_new")
            if not content.get("description_text_raw"): missing.append("description")
            if not images_list: missing.append("images")
            if missing:
                missing_fields.append({
                    "snapshot_id": str(snap.id),
                    "url": url,
                    "missing_fields": ", ".join(missing),
                })

            # Geo coverage
            coords = location.get("source_coordinates")
            geo_coverage.append({
                "snapshot_id": str(snap.id),
                "url": url,
                "has_coordinates": bool(coords),
                "latitude": coords.get("lat") if coords else None,
                "longitude": coords.get("lng") if coords else None,
                "precision_evidence": coords.get("evidence") if coords else "none",
                "has_map_href": bool(location.get("map_href_raw")),
                "has_address_new": bool(addr_new),
            })

            # Image coverage
            image_coverage.append({
                "snapshot_id": str(snap.id),
                "url": url,
                "image_count": len(images_list),
                "cover_image_present": any(img.get("is_cover") for img in images_list),
                "video_present": media.get("video_present", False),
            })

            # Duplicate tracking
            if title:
                title_map.setdefault(title, []).append(url)
            if addr_new:
                address_map.setdefault(addr_new, []).append(url)

        for t, urls in title_map.items():
            if len(urls) > 1:
                duplicate_candidates.append({"type": "shared_title", "key": t, "urls": " | ".join(urls)})
        for a, urls in address_map.items():
            if len(urls) > 1:
                duplicate_candidates.append({"type": "shared_address", "key": a, "urls": " | ".join(urls)})

        # 1. Field coverage CSV
        field_coverage_file = os.path.join(self.output_dir, "field_coverage.csv")
        with open(field_coverage_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["field_name", "present_count", "total_snapshots", "coverage_pct"])
            for f_name, count in field_counts.items():
                pct = (count / total_snapshots * 100.0) if total_snapshots > 0 else 0.0
                writer.writerow([f_name, count, total_snapshots, f"{pct:.2f}%"])

        # 2. Price conflicts CSV
        price_conflicts_file = os.path.join(self.output_dir, "price_conflicts.csv")
        with open(price_conflicts_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["snapshot_id", "url", "header_price", "description_prices", "has_conflict_warning"])
            writer.writeheader()
            writer.writerows(price_conflicts)

        # 3. Missing fields CSV
        missing_fields_file = os.path.join(self.output_dir, "missing_fields.csv")
        with open(missing_fields_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["snapshot_id", "url", "missing_fields"])
            writer.writeheader()
            writer.writerows(missing_fields)

        # 4. Geo coverage CSV
        geo_coverage_file = os.path.join(self.output_dir, "geo_coverage.csv")
        with open(geo_coverage_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["snapshot_id", "url", "has_coordinates", "latitude", "longitude", "precision_evidence", "has_map_href", "has_address_new"])
            writer.writeheader()
            writer.writerows(geo_coverage)

        # 5. Image coverage CSV
        image_coverage_file = os.path.join(self.output_dir, "image_coverage.csv")
        with open(image_coverage_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["snapshot_id", "url", "image_count", "cover_image_present", "video_present"])
            writer.writeheader()
            writer.writerows(image_coverage)

        # 6. Duplicate candidates CSV
        duplicate_candidates_file = os.path.join(self.output_dir, "duplicate_candidates.csv")
        with open(duplicate_candidates_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["type", "key", "urls"])
            writer.writeheader()
            writer.writerows(duplicate_candidates)

        err_query = self.db.query(IngestionError)
        if run_uuid:
            err_query = err_query.filter(IngestionError.run_id == run_uuid)
        errors = err_query.all()

        errors_file = os.path.join(self.output_dir, "errors.csv")
        with open(errors_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "stage", "error_code", "retryable", "occurred_at", "source_url", "message"])
            for e in errors:
                writer.writerow([str(e.id), e.stage, e.error_code, e.retryable, e.occurred_at.isoformat(), e.source_url or "", e.message or ""])

        # 8. Crawl summary JSON
        summary = {
            "total_snapshots": total_snapshots,
            "field_counts": field_counts,
            "price_conflicts_count": len(price_conflicts),
            "missing_fields_count": len(missing_fields),
            "duplicate_candidates_count": len(duplicate_candidates),
            "errors_count": len(errors),
            "explicit_coordinates_count": field_counts["source_coordinates"],
            "explicit_coordinates_pct": f"{(field_counts['source_coordinates'] / total_snapshots * 100.0 if total_snapshots > 0 else 0):.2f}%",
        }
        summary_file = os.path.join(self.output_dir, "crawl_summary.json")
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        return summary
