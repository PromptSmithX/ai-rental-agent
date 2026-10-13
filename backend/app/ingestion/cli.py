import argparse
import sys
import uuid
from typing import Optional

from app.database import SessionLocal
from app.ingestion.config import IngestionConfig
from app.ingestion.service import IngestionService
from app.ingestion.profiling import DataProfiler


def main():
    parser = argparse.ArgumentParser(description="AI Rental Copilot - Data Ingestion v1 CLI")
    parser.add_argument("--scope", type=str, default="hanoi", help="Crawl scope (default: hanoi)")
    parser.add_argument("--max-listings", type=int, default=None, help="Maximum detail listings to fetch")
    parser.add_argument("--page-limit", type=int, default=None, help="Maximum index pages to traverse")
    parser.add_argument("--seed-url", type=str, default="https://tromoi.com/tim-tro-tai-ha-noi", help="Seed URL")
    parser.add_argument("--resume", action="store_true", help="Resume previous ingestion run")
    parser.add_argument("--run-id", type=str, default=None, help="Specific run ID to resume or profile")
    parser.add_argument("--no-images", action="store_true", help="Disable image downloads (metadata-only)")
    parser.add_argument("--images", action="store_true", help="Enable authorized image downloads")
    parser.add_argument("--dry-run", action="store_true", help="Discover URLs without database persistence")
    parser.add_argument("--profile-only", action="store_true", help="Generate quality profiling reports only")
    parser.add_argument("--output-dir", type=str, default="reports", help="Directory for profiling reports")

    args = parser.parse_args()

    # Image download toggle
    images_enabled = False
    if args.images:
        images_enabled = True
    elif args.no_images:
        images_enabled = False

    config = IngestionConfig(
        seed_url=args.seed_url,
        scope_city="ha_noi",
        page_limit=args.page_limit,
        max_listings=args.max_listings,
        images_enabled=images_enabled,
    )

    db = SessionLocal()
    try:
        if args.profile_only:
            print(f"Generating profiling reports in '{args.output_dir}'...")
            profiler = DataProfiler(db=db, output_dir=args.output_dir)
            summary = profiler.generate_all_reports(run_id=args.run_id)
            print("Profiling completed:")
            print(f"- Total snapshots: {summary['total_snapshots']}")
            print(f"- Price conflicts: {summary['price_conflicts_count']}")
            print(f"- Missing fields: {summary['missing_fields_count']}")
            print(f"- Duplicate candidates: {summary['duplicate_candidates_count']}")
            return

        service = IngestionService(db=db, config=config)

        if args.dry_run:
            print(f"[DRY-RUN] Discovering Hanoi listings from {config.seed_url}...")
            resp = service.collector.fetch(config.seed_url)
            urls = service.collector.validate_url(config.seed_url)
            discovered = service.discover_detail_urls if hasattr(service, "discover_detail_urls") else []
            from app.ingestion.adapters.tromoi import TromoiSourceAdapter
            discovered = TromoiSourceAdapter.discover_detail_urls(resp.text)
            print(f"[DRY-RUN] Discovered {len(discovered)} detail URLs on seed page:")
            for u in discovered[:10]:
                print(f"  - {u}")
            return

        run_uuid = uuid.UUID(args.run_id) if args.run_id else None
        print(f"Starting ingestion run (scope={args.scope}, max={args.max_listings}, images={images_enabled})...")
        run = service.run_crawl(
            run_id=run_uuid,
            max_listings=args.max_listings,
            resume=args.resume,
            permission_status="allowed" if images_enabled else "unknown",
        )
        print(f"Ingestion run finished with status: {run.status}")
        print(f"- Discovered: {run.discovered_count}")
        print(f"- Fetched: {run.fetched_count}")
        print(f"- Changed: {run.changed_count}")
        print(f"- Failed: {run.failed_count}")

        # Generate reports after run
        profiler = DataProfiler(db=db, output_dir=args.output_dir)
        profiler.generate_all_reports(run_id=str(run.id))
        print(f"Quality reports written to '{args.output_dir}' directory.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
