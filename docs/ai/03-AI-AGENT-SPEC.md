# 03 — AI Agent Specification (future system + mock behavior)

## Scope & boundary
This describes the **intended** FastAPI/LangGraph contract and the **currently simulated** frontend behavior. No production AI is shipped in phase F. Never label mock events as real tool executions.

## Responsibilities
- LLM (later): extract intent and filter updates, request clarification, summarize grounded tool results.
- Deterministic tools/services (later): resolve campus, query rooms, compute straight-line distance, rank, fetch details and compare.
- Frontend today: deterministic scenario matcher/service behind same interface, typed state/event stream, simulated timeline.

## Intended graph
`receive → classify_intent → extract_filter_patch → validate/resolve_campus → [clarify OR search_rooms → distance_filter → rank_rooms → generate_response] → END`; `get_room_details`/`compare_rooms` branches by intent. For MVP these are **mock logical stages**.

## Tool catalog
| Tool | Input | Output | Notes |
|---|---|---|---|
| `resolve_campus` | name, optional campus name | campusId, coordinates, ambiguity | local campus registry first, no blind geocoding |
| `search_rooms` | validated SearchFilters | room IDs + structured metadata | SQL hard filters on actual backend; mock array now |
| `calculate_air_distance` | campus coordinate + room coordinates | km / unavailable | Haversine/PostGIS; not road network distance |
| `rank_rooms` | eligible rooms + preference weights | ordered IDs + reasons | deterministic and auditable, never override hard filters |
| `get_room_details` | roomId | RoomView | metadata with source and freshness |
| `compare_rooms` | 2–3 room IDs | attribute comparison | unknown values stay unknown |

Only expose functions as LLM tools when agent needs a choice; internal spatial/ranking utilities can remain ordinary Python functions.

## Filter model / policy
`campusId`, `maxPrice`, `maxDistanceKm`, `minAreaM2`, `requiredAmenities`, `petAllowed`, `sortBy`. Interpret price as VND/month, distance as aerial km. Do not implicitly assume “near” = exactly 2 km; choose a visible adjustable default or clarify based on app setting. Unsupported criteria go in a clarification note, never silently ignored.

## Update semantics
- Patch only fields explicitly referred to. “Dưới 2,5 triệu” => replace maxPrice, not other fields.
- “Bỏ yêu cầu máy lạnh” => remove that item from requiredAmenities.
- “Không cần gần trường nữa” => set maxDistanceKm null; no campus change unless specified.
- Null is a clear signal, absent key = keep existing state. Avoid merging empty arrays as no-op unless that behavior is explicitly defined.
- Any manual filter change should be committed to the same canonical state before next agent turn.

## Ranking outline
Hard filters before scoring. Candidate scoring: 0.40 normalized distance, 0.35 budget headroom, 0.25 optional amenity overlap — illustrative, not calibrated. Keep score computation deterministic; explanation cites known data and notes missing information. Do not use an invented “92% verified match” metric; if displaying score, label `mức độ phù hợp ước tính` and explain computation.

## Planned LangGraph state
`threadId, messages, filters, intent, campusResolution, searchResults, rankedRoomIds, toolEvents, assistantResponse, error`. In production use durable checkpointer; do not store secrets or unredacted sensitive tool logs.

## Event protocol
The model event contract is in `06-DATA-CONTRACT.md`. Sequence for successful search: `run_started → preferences_extracted → campus_resolved → rooms_searched → distance_filtered → rooms_ranked → response_ready → run_completed`. `run_failed` and `clarification_required` are terminal alternatives. Frontend uses `isSimulation: true` until backend stream exists.

## Grounding / guardrails
- Response references only room IDs returned by tool/search result.
- Price, photos, availability, source and coordinates are data fields, not LLM-authored prose facts.
- Never claim room is currently available, exact location, or verified without evidence.
- Provide source attribution and stale timestamp when real data exists.
- No external automated contact, payment, or booking actions in MVP.

## Minimal evaluation plan (later)
Filter extraction exact match, strict constraint violations, context refinement preservation, room-ID grounding, unknown-data handling, tool failure recovery, latency and cost. Save reproducible offline evaluation cases before switching to real LLM.
