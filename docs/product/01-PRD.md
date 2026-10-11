# 01 — Product Requirements Document

## 1. Tổng quan
**Tên:** AI Rental Copilot / TroMate AI (working title). **Đối tượng:** sinh viên Việt Nam tìm trọ gần cơ sở trường đại học. **Định vị:** AI-first housing discovery; chat là thao tác chính, bản đồ và danh sách là minh chứng trực quan của kết quả.

## 2. Vấn đề
Sinh viên phải đọc nhiều tin rời rạc, so sánh giá/phụ phí, xác định vị trí gần trường và nhớ các điều kiện giữa những lượt tìm kiếm. Tin thiếu tọa độ/đã cũ làm giảm độ tin cậy.

## 3. Mục tiêu MVP
- User mô tả bằng tiếng Việt: campus, ngân sách, khoảng cách km, tiện ích, cho nuôi thú cưng.
- Demo agent tách bộ lọc, hiển thị editable chips và update map/list nhất quán.
- Cho phép chọn phòng, xem ảnh minh họa được cấp phép hoặc placeholder, giá, diện tích, khoảng cách giả lập và nhãn độ chính xác vị trí.
- Cho phép chat refine nhiều lượt, so sánh 2 phòng, làm rõ ý định thiếu thông tin.
- Cho phép bật Developer Trace panel, xem event/tool outputs từ mock service, đánh dấu **Simulation**.

## 4. Persona
**Minh:** sinh viên năm nhất, tìm phòng ≤ 3 triệu gần HCMUT, biết ít về địa lý. **Lan:** muốn nuôi mèo, quan tâm chi phí phát sinh. **Người phản biện đồ án:** cần nhìn thấy luồng tool và kết quả có căn cứ.

## 5. Jobs to be done
- Khi mô tả nhu cầu, tôi muốn AI chuyển thành điều kiện có thể chỉnh sửa.
- Khi xem kết quả, tôi muốn biết vì sao phòng được đề xuất và nó nằm ở đâu.
- Khi đổi tiêu chí, tôi muốn các marker/card cập nhật mà không mất ngữ cảnh.
- Khi thông tin thiếu/chưa xác minh, tôi muốn được báo rõ, không tạo cảm giác chắc chắn giả.

## 6. Functional requirements
| ID | Feature | Priority | Acceptance criteria |
|---|---|---|---|
| FR-01 | AI Search Home | P0 | Prompt textbox + 3 example prompts; submit mở Workspace |
| FR-02 | Conversation | P0 | User/assistant bubbles, pending/error state, history trong session |
| FR-03 | Filter extraction demo | P0 | `SearchFilters` phản ánh prompt fixture, chips có thể remove/update |
| FR-04 | Search results | P0 | Rooms match toàn bộ hard filters; show empty state |
| FR-05 | Interactive Map | P0 | Campus pin, km radius, room price markers, click sync card |
| FR-06 | Room details | P0 | Gallery/placeholder, price, area, amenities, source/last checked, confidence |
| FR-07 | Context refinement | P0 | Lượt sau giữ tiêu chí cũ trừ những trường thay đổi |
| FR-08 | Simulation timeline | P0 | Event `extract → search → distance → rank → response` theo mock event data |
| FR-09 | Compare two rooms | P1 | Side-by-side diff, not hallucinated |
| FR-10 | Dev trace | P1 | Node, input/output sanitized, status, latency simulated indicator |
| FR-11 | Saved rooms | P2 | Optional localStorage, no auth requirement |

## 7. Non-functional requirements
- Responsive desktop/tablet/mobile; keyboard navigation and visible focus indicators.
- Screen reader labels for map/list synchronization; list-only fallback if map unavailable.
- Demo search response visually reacts under ~1s on local mock (not an SLA); never simulate fake real network calls.
- No secret keys in frontend. No personal phone/email from scraped listings in seed.
- Strict TypeScript, deterministic fixtures, tests for filters/state.

## 8. Trust & safety UX
- Dataset is demonstrative: persistent `Demo data` indication.
- `locationAccuracy: exact | approximate | unknown` where `exact` only if externally verified; sample records should use `approximate` or `unknown`.
- No “verified” badge without actual verification. User can open original source only when an authorized source link exists.
- Price shown as advertised rent, not total monthly cost unless fees known.
- Missing coordinates -> list only, never place a fabricated marker.

## 9. Success metrics (MVP test, not user behavior claim)
- 100% fixtures with consistent `RoomView` schema; 0 mismatched card/marker room IDs.
- 100% tested hard-filter cases exclude disallowed results.
- ≥ 10 conversation scenarios pass in local tests, including refine and no-result.
- Keyboard support for primary flows; no critical accessibility violations in automated audit.

## 10. Out of scope / roadmap
Phase 2: FastAPI, SQLAlchemy/PostGIS, persisted conversation, verified ingestion pipeline and source licensing. Phase 3: real LLM/LangGraph, streaming events, geocoding, evaluation. Phase 4: RAG for long descriptions and additional recommendations if justified.

## 11. Open decisions
- Brand name and graphic identity; hosting provider; auth; geographic expansion; data licensing; campus geocoding accuracy. Do not block frontend MVP on these.
