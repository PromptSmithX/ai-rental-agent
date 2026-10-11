# 02 — User Flows & State Transitions

## Route map
`/` Search Home → `/workspace` Chat + Filters + Map/List → `/rooms/:id` Room Insight. Developer mode is a collapsible drawer in `/workspace`, not a required separate route. `/compare?ids=x,y` optional P1.

## Flow A — First search
1. Landing shows prompt and examples, no authentication barrier.
2. User enters: “Tìm phòng dưới 3 triệu gần Bách Khoa cơ sở Lý Thường Kiệt, trong 2 km, máy lạnh”.
3. Route to Workspace, append user message and emit simulated state `extracting`.
4. Mock service returns structured filters and demo event sequence, NOT a real LLM.
5. Shared search state updates; filter chips appear.
6. Search mock dataset; result list and map markers use the **same filtered collection**.
7. Agent summary links referenced room IDs; click focuses card and corresponding marker.
8. User opens room details and returns without losing conversation state.

## Flow B — Refinement
Current: `{campusId: 'hcmut-ltk', maxPrice: 3000000, maxDistanceKm: 2}`. User: “Có máy lạnh và được nuôi mèo nữa”. Apply **patch** `{requiredAmenities: ['air_conditioner'], petAllowed:true}`; do not erase campus, price or radius. Show chips and rerun search. Removing a chip should change UI state and future dialogue context.

## Flow C — Ambiguous/insufficient context
User: “Tìm phòng gần trường mình”. With no campus available, status `needs_clarification`, ask campus instead of guessing. Avoid fabricated search results. If user chooses HCMUT but no campus specified and >1 known, offer campus selector.

## Flow D — No results
On zero match, leave current filters visible, show friendly empty state and contextual relaxation actions (e.g., raise max price, expand radius), but **never automatically loosen mandatory filters**. User must opt in to each change.

## Flow E — Compare
User picks 2 rooms from current result set, then chooses compare. Display actual known attributes, “Chưa có thông tin” for missing. Agent explanation limited to available values. If chosen ID missing, show gentle error and allow reselection.

## Flow F — Location uncertainty
Room has no coordinates: show in list with `Không có vị trí chính xác`; omit map marker. Room marked approximate: use dashed ring/info text, avoid precision claims. Exact km only if valid coordinate pair and known campus; label “khoảng cách đường chim bay (ước tính)”.

## Flow G — Error and loading
- Mock service rejects / times out: timeline `failed`, retry button, filters/result state remains intact.
- Map tile unavailable: list still usable; fallback message and search functional.
- Broken/missing image: accessible placeholder; no layout jump.
- Reload `/workspace`: current session may reset; make behavior explicit in UI; no pretend persisted chat.

## Desktop ↔ mobile
Desktop: left ~380–420px AI panel, right content map and compact results drawer; responsive widths. Mobile: chat and results tabs, map full height with bottom-sheet/list toggle; always-visible way to return to chat. Selection/filter state survives view switch.

## State machine (logical)
`idle → extracting → searching → ranking → completed`; branches `needs_clarification`, `empty`, `failed`. Events are service outputs; do not infer success from a timer alone. Always display `Simulation` in frontend-only phase.

## Accessibility
Focus moves predictably after search, modal/drawer traps focus, Escape closes overlays, all markers have equivalent selectable entries in list; live region announces number of results without interrupting typing.
