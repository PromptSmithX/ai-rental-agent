# 06 — Validation & test matrix

## Fixture-based automated tests
1. **Dual prices:** heading 2.7m, description 3m → both retained; conflict candidate in profiling; canonical price unset.
2. **New/old address:** both exact strings retained, no inferred lat/lng.
3. **Amenity gap:** `Điều hòa` in description without tag → raw description retained; no auto-positive tag.
4. **Unknown negative:** missing pet tag/text → unknown, never false.
5. **Area range:** `20–25m²` retained as raw text, not forced to 20 or 25.
6. **Fees:** electricity, water, waste separately found as source strings; no converted price in raw.
7. **Gallery:** preserve order and cover, avoid duplicate source URLs; no video binary.
8. **Optional data:** missing date/images/map/area yields nullable/empty schema-valid records.
9. **Source scope:** non-Hanoi detail rejected/flagged despite appearing on index.
10. **Snapshot idempotency:** same URL + same stable hash yields one snapshot; changed content yields new one.
11. **Hash stability:** fetch timestamp changes alone do not generate a new snapshot.
12. **Pagination:** repeating links and self-links do not cause loops.
13. **Retry:** 429/503 backoff and Retry-After; 403/CAPTCHA stops; no bypass.
14. **Media:** invalid MIME, huge image, disallowed rights, private-network URL skipped safely.
15. **Privacy:** owner phone/name not persisted as normal search fields or profiling exports.
16. **Persist failure:** transactional rollback prevents half-written snapshot/media.
17. **Resume:** restart from checkpoint without duplicate images/records.
18. **Frontend isolation:** raw schema migration doesn't change `RoomView` types.

## Profiling metrics (report measured values; no invented pass-rate)
- Crawled index pages / discovered detail URLs / fetched details / parse successes, errors and skip reasons.
- % nonempty title, raw header price, description, new address, old address, amenities, image count, map metadata.
- Price conflict candidates; date format variability; unparsed price variants; suspected duplicate URLs and near-duplicate listings.
- Image per listing distribution, total image bytes, rights status, skipped media and reasons.
- % explicit coordinates vs address-only vs no location, and precision evidence.
- Hannover? No: assert Hanoi scope consistently (guard against hardcoded TP.HCM mocks).

## Definition of quality gate
Complete tests and reports on 20–50 authorized diverse fixtures first. Any migration to canonical tables must include mapping decisions, missingness metrics and explicit review of inconsistent price/property/unit semantics. Never set target percentages as measured achievements.
