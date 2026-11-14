# 02 — Raw JSON schema contract

**Canonical version:** `1.0.0`. JSON payload stored in `raw_listing_snapshots.payload` (JSONB), optionally latest copy in `raw_listings.latest_payload`. Use UTC ISO-8601 timestamps; VND amounts **remain strings** in raw layer. `null` = not observed, `[]` = observed no items **only if the parser can distinguish emptiness**; otherwise use null. Never coerce missing amenity to false.

## Root fields
| Field | Type | Required | Meaning |
|---|---|---|---|
| `schema_version` | string | yes | version for migrations |
| `source` | object | yes | `site`, `url`, `canonical_url`, `source_listing_id?`, `category_url`, `scope_city` |
| `fetch` | object | yes | `fetched_at`, `http_status`, `final_url`, `content_type`, `etag?`, `last_modified?`, `html_sha256?`, `parser_version` |
| `listing` | object | yes | `title_raw`, `category_raw`, badges, `posted_date_raw`, `availability_raw`, `units_count_raw`, owner display name **excluded by default** |
| `pricing` | object | yes | `header_price_raw`, `description_price_mentions_raw[]`, other raw fee strings; no selected canonical price |
| `location` | object | yes | `address_new_raw`, `address_old_raw`, `address_description_raw`, `map_href_raw?`, `source_coordinates?` only if explicitly published |
| `attributes` | object | yes | `amenity_tags_raw[]`, `target_tenants_raw[]`, `surroundings_tags_raw[]`, `other_tags_raw[]` |
| `content` | object | yes | `description_text_raw`, `description_html_raw?` only when permitted; headings/sections raw; parser source pointers optional |
| `media` | object | yes | image manifest refs (`source_url`, `position`, `alt_raw`, `is_cover`) and **video metadata only** (`video_present`, `video_page_url?`) |
| `capture` | object | yes | `field_sources` selector provenance, `warnings[]`, unknown raw fields, parser notes |

Optional source-specific extra fields go under `capture.extra_raw` rather than changing canonical fields. A display name or phone number visible on a public page is **not required** for search and should be excluded/redacted by default. Images are media records; URLs in payload are a snapshot/reference, not evidence that local files were saved.

## Media policy and image references
`media.images` stores *references* from page parse. The `raw_listing_images` table controls each asset’s `download_status`, `storage_key`, checksum, and rights. No third-party URL is assumed display-authorized. Store cover/ordered gallery; dedupe duplicate URLs **within the same listing** without changing gallery order. For public demo, use only authorized stored media or source-approved display method.

## Coordinate precision and privacy
`source_coordinates` contains `{lat, lng, evidence, precision_claim}` **only if from explicit page-provided geographic metadata and collection permitted**. A `maps` hyperlink is not always latitude/longitude. Geocode separately in future; mark approximate by default until location independently verified.

## Price conflict rule
A header `2,7 triệu/tháng` and text `Giá thuê 3 triệu/tháng` are both retained unchanged. Generate a `price_conflict_candidate` profiling flag **later**, never overwrite raw data.

## JSON schema versioning
- Same meaning, optional additional fields: minor version.
- Rename/remove/semantic changes: major version, add migrator and backward-compatible reader.
- Validate via Pydantic v2 models while preserving extra fields (`extra='allow'`) for forward compatibility and maintaining typed core objects.

See `examples/raw-listing-example.json` for explicit nulls and the exact shape.
