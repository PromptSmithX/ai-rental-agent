# 07 — Mock Scenarios and Demo Fixtures

## Goal
Build a deterministic simulation of the *future* AI agent. Never perform fake tool calls presented as real. Mock behavior should be scenario-driven, not guess arbitrary user intent with a brittle universal regex. Use curated example prompts and explicit UI controls for other inputs. Outside known scenarios, return clarification/help, not fabricated structured extraction.

## Fixture model
Create 2 campus records (use **clearly fictional coordinates** for sandbox visualization or validated public coordinates only if sourced/checked), 12–20 room records with stable `demo-room-01` IDs, 4 types of records:
- Valid approximate coordinate + within price/distance.
- Valid approximate coordinate + outside distance.
- Missing coordinates (`locationAccuracy: unknown`).
- Unknown price-related extras/amenity/pet status.
No externally sourced photos without permission: use local placeholders or licensed photos and record provenance.

## 12 required scenario tests
| ID | User utterance | Expected behavior |
|---|---|---|
| S01 | “Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km” | extract price/campus/radius; search |
| S02 | “Có máy lạnh nữa” | preserve existing filters; add air_conditioner |
| S03 | “Cho nuôi mèo” | petAllowed true; rerun search |
| S04 | “Tăng ngân sách lên 3,5 triệu” | only maxPriceVnd patched |
| S05 | “Bỏ máy lạnh đi” | remove amenity while preserving rest |
| S06 | “Tìm phòng gần trường mình” | ask campus rather than invent |
| S07 | “Dưới 1 triệu, có điều hòa, nuôi mèo, dưới 500m” | expected zero-result when fixture supports it, suggest relaxation |
| S08 | “Cho mình xem phòng demo-room-01” | get detail for existing ID |
| S09 | “So sánh phòng 01 và 02” | compare known attributes only |
| S10 | “Phòng nào gần nhất?” | sort by computed aerial distance, not road distance |
| S11 | “Có phòng nào hết hạn không?” | do not claim availability; show listing status unknown |
| S12 | Unknown unrelated text | ask clarification or show guidance, not made-up search |

## Timeline fixtures
Successful run events: `run_started`, `preferences_extracted`, `campus_resolved`, `rooms_searched`, `distance_filtered`, `rooms_ranked`, `response_ready`, `run_completed`. Each event `isSimulation=true`. For missing campus: `run_started`, `preferences_extracted`, `clarification_required`. For test failure: `run_started`, `run_failed`.

## Room mock coverage
- At least one `petAllowed: true`, one `false`, one `null`.
- At least one room with image empty, one no coordinates, one outside radius, one over budget, one with missing area.
- At least one case where filtered room order changes by `sortBy`.
- All mock list/marker positions must come from the same fixture records and coordinate fields.

## Tests to automate
- Scenario outputs match expected filter patch (not just assistant message strings).
- A refinement preserves unrelated preferences.
- Search only returns IDs of eligible fixtures; compare/list/detail reference valid room IDs.
- Map marker room IDs equal matching hits with coordinates; list includes matching hits regardless of coordinate if no distance hard filter.
- Search radius geometry and distanceKm use a single Haversine utility.
- Backend swapping: mock agent service can be replaced without changing components.
- Simulated status clearly displayed for all event timeline views.

## Demo protocol
Run S01 → S02 → S04 → select marker/card → open Room Insight → compare → show trace drawer. Display visible “Dữ liệu minh họa / AI mô phỏng” in demo header.
