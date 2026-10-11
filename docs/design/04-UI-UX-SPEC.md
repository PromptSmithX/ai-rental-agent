# 04 — UI/UX Specification — AI-native Workspace

## Design philosophy
AI is the default entry point; visual outcomes are first-class. Make AI activity **observable rather than magical**: extracted requirements, tool status, result provenance and reversible actions. Do NOT show private chain-of-thought; show only user-facing validated task events.

## Frame 01: AI Search Home (`/`)
- Desktop hero: logo, one-line promise, large textarea, Submit button, example prompt chips, campus quick-select.
- On submit: immediately show user's text in workspace; if empty, disable Submit.
- UI states: idle, invalid empty, navigation/error fallback.
- Mobile: 1-column, bottom-safe-area controls.

## Frame 02: AI Agent Workspace (`/workspace`) — primary
### Desktop
- Header (64–72px): brand, campus context, demo indicator, developer trace toggle.
- Left (min 340px, target 380–420px): conversation, concise execution timeline, editable extracted filter chips, sticky composer.
- Right: results count, sort/control bar; interactive map with price markers and campus pin/radius; selectable room card strip/list.
- Chat panel is primary but map should never collapse below useful area. At narrower widths allow tabs/expandable panes.
### Mobile
- Tab controls: `Chat`, `Map`, `Rooms`; map uses full region, result cards in bottom sheet/list; active selection synchronized.
- Sticky composer when Chat active; prominent switch back from Map to Chat.
### Functional interactions
- Chat submit triggers mock service; disable repeat submit while pending or queue explicitly.
- Chips editable/remove; update shared canonical SearchFilters and results.
- Click marker selects room; scroll/focus matching card. Click card highlights marker; detail links preserve context.
- Show locationAccuracy legend and radius meaning. For unknown coordinates room remains in list.
- Filters and card content visibly update on follow-up chat without page reload.
- Map view pan/zoom by itself does not silently alter hard-filter radius; provide explicit “Tìm trong khu vực này” later if desired.
### States
Loading/simulated tools, success, clarify, zero results, service failure, map failure, image missing.

## Frame 03: Room Insight (`/rooms/:id`)
- Image gallery (licensed or local demo placeholders), title, monthly rent, area, distance (straight-line), amenities, address + accuracy disclosure.
- Source block: original listing (if authorized), last seen/verified status, known versus unknown fees.
- `AI vì sao phù hợp`: grounded bullets tied to active filters; no hallucinated attributes.
- CTA: Back to results, Save (optional), Compare (optional); no fake owner contact.

## Frame 04: Agent Trace Drawer (developer mode)
- Clearly labeled `Simulation / Mock events`; chronological event list with status, node/tool name, structured input/output summary, elapsed ms marked simulated.
- Raw JSON inspector with secrets/PII excluded; developer-only toggle, closed by default for ordinary users.
- No private reasoning text, just system-level executed/simulated steps.

## Frame 05 (P1): Compare
- 2–3 rooms side-by-side, price, area, distance, fees (unknown allowed), pets, amenities; AI summary based on available columns.

## Interaction contract
- SelectedRoomId canonical once; marker + card derived from it.
- VisibleRooms canonical from `filters` + fixture/service output; never separately filter map and list.
- Chat events and filters are shared and durable during session.
- UI distinguishes `runStatus` vs `datasetQuality` (a completed demo run does not mean listings are verified).

## Content / microcopy
- Hero: “Bạn muốn tìm phòng trọ như thế nào?”
- Chat example: “Tìm phòng dưới 3 triệu, trong 2 km quanh Bách Khoa, có máy lạnh.”
- Extraction heading: “Mình hiểu nhu cầu của bạn như sau”
- Simulated progress: “Mô phỏng: đang lọc dữ liệu phòng mẫu…”
- Result explanation: “Phòng này đáp ứng ngân sách và tiện ích bạn đã chọn.”
- Empty: “Chưa có phòng mẫu nào đáp ứng toàn bộ tiêu chí. Thử tăng ngân sách hoặc mở rộng bán kính.”
- Location: “Khoảng cách đường chim bay, vị trí ước lượng.”

## Accessibility acceptance
Visible keyboard focus; text contrast ≥ WCAG AA for typical text; buttons min 44px touch target; labeled controls; keyboard-operable card list; screen-reader friendly results updates; reduced-motion preference respected; never rely only on marker color.
