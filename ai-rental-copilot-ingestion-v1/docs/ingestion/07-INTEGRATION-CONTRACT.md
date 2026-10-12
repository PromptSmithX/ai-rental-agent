# 07 — Integration contract and migration boundary

## Three models, no premature coupling
1. `RawSourceListing v1`: source-faithful fields and snapshots; arbitrary extras, no inferred canonical truth.
2. `NormalizedListing v1` (future): typed prices, facilities, area ranges, evidence pointers, conflict status, location confidence, proposed property/unit split.
3. `RoomView` (existing frontend): stable presentation adapter; don't bind frontend to `raw_*` tables.

## Data flow / ownership
- Ingestion code writes only `ingestion_*`, `raw_*` tables and media storage.
- Existing Rooms/Search modules remain authoritative for search; raw records are **not queryable as verified rooms** until import review.
- Later `Normalizer` emits candidates and `CanonicalImporter` applies approval policy to rental_properties / rental_units or existing models.
- `RoomView` mapper transforms canonical models into the current frontend; keep API compatibility with TypeScript contract.

## Proposed future normalized fields (NOT raw columns)
`price_min_vnd`, `price_max_vnd`, `price_basis`, `price_conflict_status`; `area_min_m2`,`area_max_m2`; `amenity_evidence` map with `present|absent|unknown|conflicting`; `fees` typed with units; `property_kind`,`unit_kind`; `latitude`,`longitude`,`location_accuracy`; `availability_status=unknown` until checked; image rights and provenance; `source_updated_at`, `collected_at`, `verified_at`.

## Design decisions pending measured data
- Is one listing a room or whole building? What is frequency of ranges/multiple units?
- Can rooms with approximate geocode be filtered in radius? Default: treat separately/mark approximate and do not assert exact threshold.
- How to resolve price conflicts? Default: flag and display both with warning or exclude price-sensitive hard-filter until verified.
- Image rights: local storage, source-approved links, or placeholder.
- Regional admin names: preserve historical and new addresses; separate normalization/geocoding.

## Future SSE/Agent
AI tools should read only canonical SearchService. Raw listing and snapshots are ingestion/audit artifacts; LLM must not convert unverified raw text into authoritative room facts without validation.
