-- PostgreSQL 15+; proposal: integrate into existing Alembic, do not apply directly without review.
-- UUID generated in Python application; keep sensitive source fields out of raw payload where possible.
CREATE TABLE IF NOT EXISTS ingestion_runs (
 id UUID PRIMARY KEY, source_name TEXT NOT NULL, scope_city TEXT NOT NULL,
 started_at TIMESTAMPTZ NOT NULL, finished_at TIMESTAMPTZ,
 status TEXT NOT NULL CHECK (status IN ('running','paused','completed','failed','cancelled')),
 source_category_url TEXT NOT NULL, config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
 discovered_count INT NOT NULL DEFAULT 0, fetched_count INT NOT NULL DEFAULT 0,
 failed_count INT NOT NULL DEFAULT 0, changed_count INT NOT NULL DEFAULT 0,
 error_summary JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS raw_listings (
 id UUID PRIMARY KEY, source_name TEXT NOT NULL,
 normalized_source_url TEXT NOT NULL, source_listing_id TEXT,
 scope_city TEXT NOT NULL, first_seen_at TIMESTAMPTZ NOT NULL,
 last_seen_at TIMESTAMPTZ NOT NULL, latest_snapshot_id UUID,
 is_active_in_source BOOLEAN, -- NULL=unknown; absence from index is not proof of inactivity
 UNIQUE(source_name, normalized_source_url)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_raw_source_stable_id
 ON raw_listings(source_name, source_listing_id) WHERE source_listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_raw_scope ON raw_listings(scope_city,source_name,last_seen_at);
CREATE TABLE IF NOT EXISTS raw_listing_snapshots (
 id UUID PRIMARY KEY, raw_listing_id UUID NOT NULL REFERENCES raw_listings(id) ON DELETE CASCADE,
 run_id UUID REFERENCES ingestion_runs(id) ON DELETE SET NULL,
 captured_at TIMESTAMPTZ NOT NULL, schema_version TEXT NOT NULL,
 content_sha256 TEXT NOT NULL, payload JSONB NOT NULL,
 -- content hash calculated on stable source content; exclude timestamps, run_id and retrieval metadata
 UNIQUE(raw_listing_id,content_sha256)
);
CREATE INDEX IF NOT EXISTS ix_snapshot_run ON raw_listing_snapshots(run_id);
CREATE INDEX IF NOT EXISTS ix_snapshot_data ON raw_listing_snapshots USING GIN(payload);
ALTER TABLE raw_listings ADD CONSTRAINT fk_latest_snapshot
 FOREIGN KEY (latest_snapshot_id) REFERENCES raw_listing_snapshots(id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE IF NOT EXISTS raw_listing_images (
 id UUID PRIMARY KEY,
 raw_listing_id UUID NOT NULL REFERENCES raw_listings(id) ON DELETE CASCADE,
 first_seen_snapshot_id UUID REFERENCES raw_listing_snapshots(id) ON DELETE SET NULL,
 position INT NOT NULL CHECK (position >= 0),
 source_url TEXT NOT NULL, source_thumbnail_url TEXT, alt_raw TEXT,
 storage_key TEXT, sha256 TEXT, mime_type TEXT, width INT, height INT, bytes BIGINT,
 permission_status TEXT NOT NULL DEFAULT 'unknown'
   CHECK(permission_status IN ('unknown','allowed','disallowed','revoked')),
 download_status TEXT NOT NULL DEFAULT 'not_attempted'
   CHECK(download_status IN ('not_attempted','queued','downloaded','failed','skipped')),
 download_error TEXT, collected_at TIMESTAMPTZ, downloaded_at TIMESTAMPTZ,
 UNIQUE(raw_listing_id,source_url)
);
CREATE INDEX IF NOT EXISTS ix_images_listing_position ON raw_listing_images(raw_listing_id, position);
CREATE TABLE IF NOT EXISTS ingestion_errors (
 id UUID PRIMARY KEY, run_id UUID REFERENCES ingestion_runs(id) ON DELETE SET NULL,
 source_url TEXT, stage TEXT NOT NULL, error_code TEXT NOT NULL,
 message TEXT, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(), retryable BOOLEAN NOT NULL DEFAULT false
);
-- Optional separate source_permissions record / operational config rather than storing admin correspondence in DB.
-- For reproducible exact gallery histories, image manifest remains in immutable snapshots.
