import argparse
import sys
import uuid
from typing import Any, Callable, Dict, Optional

from app.database import SessionLocal
from app.ingestion.config import IngestionConfig
from app.ingestion.service import IngestionService
from app.ingestion.profiling import DataProfiler

try:
    from tqdm import tqdm
except ImportError:  # pragma: no cover - fallback when tqdm is not installed
    tqdm = None


def make_progress(quiet: bool) -> Callable[[Dict[str, Any]], None]:
    """Build a progress callback that renders crawl progress.

    Uses a tqdm bar for the detail-fetch phase when available; otherwise falls
    back to plain flushed prints so it never crashes if tqdm is missing.
    """
    state: Dict[str, Any] = {"bar": None}

    def _log(msg: str) -> None:
        if state["bar"] is not None:
            state["bar"].write(msg)
        else:
            print(msg, flush=True)

    def cb(event: Dict[str, Any]) -> None:
        if quiet:
            return
        kind = event.get("event")

        if kind == "discovery":
            print(
                f"\r  Đang dò danh sách… đã thấy {event['discovered']} tin "
                f"(trang {event['pages_visited']})",
                end="",
                flush=True,
            )
        elif kind == "detail_start":
            total = event.get("total", 0)
            print(f"\n  Bắt đầu cào {total} tin chi tiết…", flush=True)
            if tqdm is not None and total > 0:
                state["bar"] = tqdm(total=total, desc="Cào chi tiết", unit="tin")
        elif kind == "detail_done":
            bar = state["bar"]
            if bar is not None:
                bar.update(1)
                bar.set_postfix(ok=event.get("fetched", 0), loi=event.get("failed", 0))
            else:
                tag = "skip" if event.get("skipped") else "ok"
                print(
                    f"  [{event.get('index')}/{event.get('total')}] {tag} "
                    f"(ok={event.get('fetched', 0)}, lỗi={event.get('failed', 0)})",
                    flush=True,
                )
        elif kind == "interrupted":
            if state["bar"] is not None:
                state["bar"].close()
                state["bar"] = None
            _log(f"\n  Đã dừng (Ctrl+C). Đã cào {event.get('fetched', 0)} tin trước khi dừng.")

    return cb


def main():
    # Vietnamese output breaks on Windows consoles defaulting to cp1252; force UTF-8.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

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
    parser.add_argument("--quiet", action="store_true", help="Disable the live progress bar (clean logs)")

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
            progress_callback=make_progress(args.quiet),
        )
        print(f"\nIngestion run finished with status: {run.status}")
        print(f"- Discovered: {run.discovered_count}")
        print(f"- Fetched: {run.fetched_count}")
        print(f"- Changed: {run.changed_count}")
        print(f"- Failed: {run.failed_count}")

        if run.status == "interrupted":
            resume_cmd = (
                f"python -m app.ingestion.cli --scope {args.scope} "
                f"{'--no-images' if not images_enabled else '--images'} "
                f"--resume --run-id {run.id}"
            )
            if args.max_listings:
                resume_cmd += f" --max-listings {args.max_listings}"
            if args.page_limit:
                resume_cmd += f" --page-limit {args.page_limit}"
            print("\nĐã dừng giữa chừng (checkpoint). Phần đã cào đã được lưu.")
            print("Chạy lệnh sau để cào tiếp phần còn lại:")
            print(f"  {resume_cmd}")

        # Generate reports after run
        profiler = DataProfiler(db=db, output_dir=args.output_dir)
        profiler.generate_all_reports(run_id=str(run.id))
        print(f"Quality reports written to '{args.output_dir}' directory.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
