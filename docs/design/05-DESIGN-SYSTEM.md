# 05 — Design System (initial tokens)

## Character
Professional, calm, AI-forward, trustworthy for students. Avoid neon sci-fi. UI language Vietnamese; data values consistently formatted `vi-VN`.

## Tokens
| Token | Light | Purpose |
|---|---|---|
| `--brand-600` | `#0D9488` | primary CTA, active state |
| `--brand-700` | `#0F766E` | hover/focus |
| `--canvas` | `#F8FAFC` | page background |
| `--surface` | `#FFFFFF` | cards / panels |
| `--text-primary` | `#0F172A` | headings |
| `--text-muted` | `#475569` | support text |
| `--border` | `#E2E8F0` | boundaries |
| `--warning` | `#B45309` | stale/approximate notice |
| `--error` | `#B91C1C` | errors |
| `--success` | `#15803D` | actual completed operations only |

Typography: `Be Vietnam Pro` if installed/served with correct license; fallback `Inter`, system sans. Sizes 12 / 14 / 16 / 20 / 24 / 32px; base line-height 1.5. Spacing 4px scale (4,8,12,16,24,32,48). Border radius 8 (chips), 12 (inputs), 16 (cards), 20 (primary panels). Soft shadows only for floating overlays.

## Component inventory
- `AppShell`, `TopNav`, `AIPromptComposer`, `PromptSuggestion`, `ChatMessage`, `AgentEventTimeline`, `FilterChip`, `FilterPopover`, `RoomCard`, `RoomGallery`, `RoomInsightPanel`, `RoomMap`, `CampusMarker`, `PriceMarker`, `RadiusOverlay`, `MapLegend`, `SelectionPreview`, `ErrorState`, `EmptyState`, `TraceDrawer`, `SimulationBadge` (only one prominent badge per area; avoid badge overload).

## Card anatomy
Image ratio 4:3; price prominent (e.g. “2,8 triệu/tháng”), title one/two lines, area, straight-line distance & caveat, amenity icons, freshness and source under details. Distinguish rent from unknown utilities; do not present an unsupported total cost.

## Map marker logic
Active marker high contrast and focus ring; inactive neutral; approximate locations use clear info marker or dashed outline plus legend, unknown omitted. Tooltip/card includes keyboard-equivalent path. Price marker label compact e.g. `2,8tr` (map only); full formatted rent in detail/card.

## Motion and feedback
100–180ms transitions for hover, panel motion 180–240ms; respect `prefers-reduced-motion`; skeleton loading for room cards; timeline status based on events, not animation alone.

## Required visual states
Inputs: idle, focus, disabled, error. Buttons: hover/focus/loading. Room cards: default, hovered, selected, no-image. Agent: idle, extracting, searching, ranking, complete, clarify, failed. Maps: loading, loaded, no-geocoordinates, tile error.

## UX writing
Avoid terms implying certainty: “đã xác minh”, “còn phòng”, “bảo đảm” except with true evidence. Use “Tin mẫu”, “Vị trí ước lượng”, “Giá đăng”, “Chưa rõ”, “Mô phỏng AI” as appropriate.
