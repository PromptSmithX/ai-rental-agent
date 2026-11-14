# 01 — Scope & architecture

## Goals
- Authorized discovery of all eligible Hà Nội rental listings from `https://tromoi.com/tim-tro-tai-ha-noi`, with bounded batches, resume, idempotency, auditability and retry.
- Keep **every source field useful to downstream parsing**: structured labels/tags, full description text and permitted HTML, original price strings even if contradictory, address new/old, image ordering and provenance, and **video metadata only** (do not download videos or video thumbnails unless expressly permitted).
- Profile actual data before changing canonical SQLAlchemy models, Pydantic schemas or UI contract.
- Produce repeatable datasets and quality reports for demo; do not claim live availability.

## Non-goals
- No LLM extraction, LangGraph, RAG, contact automation, payments, or crawling outside Hanoi.
- No guessing geo-coordinates, replacing missing fields with zeros/false, or auto-confirming listings.
- No circumvention of rate limits/access controls; no personal contact collection unless specifically justified and authorized.

## Data flow
`listing index pages → URL discovery → detail fetch → DOM/embedded-structured-data parse → raw listing → content hash/snapshot → image manifest/download policy → profiling reports`.

Future (out of scope): `raw snapshot → normalized candidates + evidence/conflicts → canonical property/unit → search API → frontend RoomView/Agent tools`.

## Layer boundaries
- **SourceAdapter** (`tromoi`): URL discovery, parsing source HTML/JSON and immutable source field captures. No DB model assumptions.
- **Collector**: HTTP requests, throttle, retries, response metadata, robots/permission gates.
- **Ingestion**: validation, dedupe keys, content hashes, JSON serialization, snapshot management, transaction boundaries.
- **MediaWorker**: first-party-controlled permitted image downloads, checksums, max bytes/pixels, safe MIME, no video.
- **Profiling**: field presence, missingness, conflicts, unparseables, media coverage, geodata coverage, coverage gaps.
- **Domain Adapter (later)**: source-specific raw → canonical entity → frontend `RoomView` (explicit versioning).

## Execution / data volume
1. Test deterministic local fixtures. 2. Authorized canary (20–50 detail pages across Hanoi districts/types). 3. Review errors and permissions. 4. Full Hanoi page traversal under limits. 5. Periodic incremental refresh after initial run. Selection is *coverage of authorized Hanoi inventory*, not blind requests for all URLs.

## Dedupe & updates
- Raw identity key: `(source_name, normalized_source_url)`; optional source ID secondary, when confirmed stable.
- A fetched page that has new content hash creates immutable snapshot. Identical unchanged hashes update `last_seen_at` and visit stats only.
- Never collapse distinct listings simply for sharing address/photos; output duplicate candidate report for review.
- A URL missing on a crawl does **not** prove room unavailable; mark stale only by explicit age/policy, never delete automatically.

## Data quality/traceability
- `data_source_type = crawled`, `verified_at = null` unless checked independently.
- Raw addresses and posted dates do not imply confirmed GPS or availability.
- Every extracted field should optionally track selector/path and original text. Raw payload retains contradictory evidence.
- Geocoding happens **later**, with accuracy label and coordinates nullable.

## Acceptance criteria
Can restart without duplicates; keeps both 2.7m header and 3m description; preserves old/new address, tags + full description; stores image manifest with no video binary; produces schema profiling; no public UI claims of verification; supports Hanoi-only scoped jobs and auditable permission config.
