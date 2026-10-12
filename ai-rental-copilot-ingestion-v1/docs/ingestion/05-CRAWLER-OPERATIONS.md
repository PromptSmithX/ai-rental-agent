# 05 — Crawler operations & safety

## Prerequisites
- Store admin authorization summary: date, sender/channel, authorized endpoints/paths, redisplay/storage of images, concurrency/rate, robots override if explicitly approved, retention and attribution. Restrict access to evidence.
- Request or confirm separate rights for storing and publicly displaying third-party images; otherwise store permitted URLs/metadata only and use placeholders in demo.
- Personal contact data are not needed for recommendation: strip names/phone/contact URLs from raw description and HTML when feasible, or protect quarantined originals with limited retention and access.

## Collector configuration example (not hard-coded)
```yaml
source: tromoi
seed_url: https://tromoi.com/tim-tro-tai-ha-noi
scope_city: ha_noi
page_limit: null # discover all authorized Hanoi pages; bound via operational budgets
max_concurrency: 2 # provisional, only use if inside authorized limits
min_delay_seconds: 2.0 # provisional, conform to admin/site rules
request_timeout_seconds: 20
max_retries: 3
retry_backoff_seconds: 2
images_enabled: false # enable only if image storage/redisplay rights documented
videos_enabled: false
max_image_bytes: 8000000
user_agent: "AI-Rental-Copilot-Research/1.0 (+project contact)"
```

## State machine
`discovered → queued → fetched → parsed → persisted → images_pending → done`; failures `retryable` vs `permanent`. Record per-URL checkpoint and last fetch status, and support `--dry-run`, `--max-listings`, `--resume`, `--no-images`, `--profile-only`, `--scope hanoi`, `--run-id`.

## Request handling
- Respect source policies/limits, use bounded concurrency + jitter and exponential backoff on transient server/429 responses (honor Retry-After); stop/review if blocked or forbidden.
- Normalize source URLs: absolute, strip fragments and tracking query parameters only when safe; never merge truly distinct detail URLs.
- Prevent SSRF: enforce approved host allowlist, safe redirect policy, DNS/IP checks and no local/private IP fetching. Also validate image host allowlist and content type.
- Log request outcome not page secrets. Never store API keys in source or logs.
- Prevent image decompression bombs; enforce byte limit and pixel count; inspect actual image signature/MIME; write temp file then atomic move to storage.
- Videos: no video files, playlists, streamed segments, or embedded video downloads.

## Operational artifacts
`crawl_summary.json`, `field_coverage.csv`, `price_conflicts.csv`, `missing_fields.csv`, `image_coverage.csv`, `geo_coverage.csv`, `errors.csv`, `duplicate_candidates.csv`. No personal contact details in reports.

## Full Hanoi plan
Canary 20–50 → parser review → authorize scaling → traversal of Hanoi listing pages → per-listing region validation → dedupe → incremental runs. Do not make availability claims based solely on scrape freshness. Avoid overwhelming source or causing unexpected disk usage: track image quota, URL count and requests.

## Definition of done
A complete authorized run is resumable, idempotent, bounded, auditable, images optional/rights-gated, produces profiling and does not mix with canonical search inventory automatically.
