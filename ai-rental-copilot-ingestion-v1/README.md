# AI Rental Copilot — Data Ingestion Specification v1.0

**Status:** design approved for implementation planning; existing frontend/backend models must be inspected before migrations. **Market:** Hà Nội only. **Source adapter:** `tromoi`. **Media:** images only, no video downloads. **Pipeline:** discovery → fetch → raw snapshots → media → profiling → subsequent normalization. **No AI implementation in this phase.**

## Read order
1. `docs/ingestion/01-SCOPE-AND-ARCHITECTURE.md`
2. `docs/ingestion/02-RAW-DATA-SCHEMA.md`
3. `docs/ingestion/03-DATABASE-DDL.sql`
4. `docs/ingestion/04-EXTRACTION-MAPPING.md`
5. `docs/ingestion/05-CRAWLER-OPERATIONS.md`
6. `docs/ingestion/06-VALIDATION-TESTING.md`
7. `docs/ingestion/07-INTEGRATION-CONTRACT.md`
8. `prompts/IMPLEMENT-INGESTION.md`
9. `examples/raw-listing-example.json`

## Integration with existing docs
This pack **supplements**, not replaces, `docs/contracts/06-DATA-CONTRACT.md` in the prior frontend pack. Raw data remains source-faithful; later normalization creates canonical domain entities; adapters then produce `RoomView`. New ingestion scope supersedes the old frontend-only prohibition on backend work **only for the crawler/data-ingestion module**. Do not implement AI/LLM/RAG in this phase.

## Rights and data stewardship
User reports administrator permission to crawl. Before bulk collection, record the authorized scope in `source_permissions` or local project documentation: allowed paths, images (download/storage/public display), rate/concurrency, retention, attribution, personal data limitations, and expiration/revocation. **Permission to crawl does not automatically mean permission to republish images or personal contact details.** Don't bypass authentication, CAPTCHAs or anti-bot controls. Track terms and robots guidance; if they conflict with the permission, clarify with the source.

## Example data
The example file is a **manual fixture transcribed from user-provided screenshots**, not a live crawl. Unknown identifiers, URLs, coordinates and images are null/empty. It should not be inserted as verified housing inventory.
