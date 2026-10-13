# AGENT-IMPLEMENTATION-PLAN.md
## AI Rental Copilot — OpenAI + LangGraph Agent v1 Architecture & Implementation Plan

> **Author:** Senior AI Engineer & Python Backend Architect  
> **Status:** Phase A — Repository Inspection & Architecture Plan (Ready for Review & Approval)  
> **Target:** `backend/app/ai/` modular agent architecture for AI Rental Copilot  
> **Date:** 2026-10-12  

---

## 1. Executive Summary & Verification Classification

This plan establishes the design, contract mapping, and phased execution strategy for **AI Agent v1** of AI Rental Copilot. Per project instructions, all architectural assertions are classified into:
- **[CONFIRMED]**: Verified directly from source files, tests, or database migrations in this repository.
- **[PROPOSED]**: Architectural and engineering decisions designed to satisfy v1 requirements without breaking existing systems.
- **[UNKNOWN]**: Items requiring explicit stakeholder or user confirmation prior to execution.

---

## 2. Existing Architecture Findings

### 2.1 Backend Findings [CONFIRMED]
1. **Framework & Version:** FastAPI 0.143.0, Pydantic 2.14.0, SQLAlchemy 2.1.4, GeoAlchemy2 0.20.0, Python 3.13 in `.venv`.
2. **Persistence Layer:**
   - Multi-dialect support: SQLite in-memory (`sqlite:///:memory:`) for pytest test suite (`backend/tests/conftest.py`); PostgreSQL 16 + PostGIS for production/docker (`DATABASE_URL`).
   - `PointGeography` type decorator (`backend/app/domain/models.py`) gracefully degrades PostGIS `Geography(POINT, 4326)` to `String(255)` on SQLite.
   - Alembic revisions:
     - `001_initial_schema.py`: Tables `campuses`, `rooms`, `room_images`.
     - `002_ingestion_v1_schema.py`: Tables `ingestion_runs`, `raw_listings`, `raw_listing_snapshots`, `raw_listing_images`, `ingestion_errors`.
3. **Core Domain Models & Entities:**
   - `Campus`: `id`, `university_name`, `campus_name`, `latitude`, `longitude`, `geom`.
   - `Room`: `id`, `title`, `price_monthly_vnd`, `area_m2`, `address_label`, `latitude`, `longitude`, `geom`, `location_accuracy` (`verified`, `approximate`, `unknown`), `amenities` (JSON list), `pet_allowed` (Nullable Boolean), `listing_status` (`unknown`, `available`, `unavailable`), `source_kind`, `source_url`, `last_checked_at`, `utilities_monthly_estimate_vnd`, `is_simulated`.
   - `RoomImage`: `id`, `room_id`, `image_url`, `caption`, `display_order`.
4. **Existing Business Services (`backend/app/services/`):**
   - `CampusService`: `list_campuses()`, `get_campus_by_id()`, `get_raw_campus()`.
   - `RoomService`: `get_room_by_id()`, `get_room_detail_by_id()`, `list_all_rooms()`, `search_rooms(filters: SearchFilters) -> SearchResult`.
   - `calculate_air_distance_km()`: Pure Haversine formula in `backend/app/services/distance.py`, earth radius 6371 km, rounded to 1 decimal place.
   - `evaluate_room_hit()` & scoring formula in `backend/app/services/ranking.py`: Hard filters evaluated prior to scoring; ranking score calculated deterministically (`0.40 * distance_score + 0.35 * budget_headroom + 0.25 * amenity_overlap`).
5. **Existing REST Endpoints (`backend/app/api/v1/`):**
   - `GET /api/v1/health`
   - `GET /api/v1/campuses`, `GET /api/v1/campuses/{id}`
   - `GET /api/v1/rooms`, `POST /api/v1/rooms/search`, `GET /api/v1/rooms/{id}`
6. **Data & Seed Status:**
   - `backend/app/seeds/seed_data.py` contains 2 campuses (`hcmut-ltk`, `hcmut-da`) and 12 demo rooms (`demo-room-01` to `demo-room-12`).
   - `backend/app/ingestion/adapters/tromoi.py` targets Hanoi listing ingestion (`HANOI_DISTRICTS`).
   - All 49 existing backend pytest unit tests pass cleanly.

### 2.2 Frontend Findings [CONFIRMED]
1. **Stack:** React 18, Vite, TypeScript (strict), Tailwind CSS, Zustand 5, Lucide-react, Vitest.
2. **Current Agent Implementation (`src/services/agent/index.ts` & `src/mocks/scenarios/index.ts`):**
   - Client uses `MockRentalAgentService` calling `matchAndExecuteScenario` for deterministic S01–S12 execution.
   - Returns typed `AgentReply` and `AgentEvent[]` (`isSimulation: true`).
3. **State Management (`src/app/store/searchStore.ts`):**
   - Single source of truth for `currentFilters`, `lastSearchResult`, `selectedRoomId`, `comparingRoomIds`, `messages`, `events`, `runStatus`.
   - Reversible chip removal via `removeFilter(field, amenityValue)` triggers re-search without losing unrelated criteria.
4. **Test Status:** 30/30 vitest unit tests pass (`scenarios.test.ts`, `filters.test.ts`, `distance.test.ts`, `store.test.ts`).

---

## 3. Reusable Services & Repositories [CONFIRMED]

The AI Agent will **not** duplicate database queries, spatial math, or scoring logic. The following components are reused directly:

| Component | File Path | Method / Function | Purpose in Agent Graph |
|---|---|---|---|
| `CampusService` | `backend/app/services/campus_service.py` | `list_campuses()`, `get_campus_by_id()` | Reused by `resolve_campus` tool |
| `RoomService` | `backend/app/services/room_service.py` | `search_rooms(filters)` | Reused by `search_rooms` tool (enforces hard SQL & in-memory filters) |
| `RoomService` | `backend/app/services/room_service.py` | `get_room_detail_by_id(id)` | Reused by `get_room_details` tool |
| `Distance Service`| `backend/app/services/distance.py` | `calculate_air_distance_km()` | Reused for campus-to-room distance verification |
| `Ranking Service` | `backend/app/services/ranking.py` | `evaluate_room_hit()` | Reused for deterministic reasons, caveats, and scores |
| `CamelModel` | `backend/app/schemas/base.py` | Automatic camelCase serialization | Reused for all AI schemas to maintain 100% frontend compatibility |

---

## 4. Missing Components & Gaps [CONFIRMED]

1. **AI Dependencies:** `langgraph`, `langchain-openai`, and `openai` are not in `backend/requirements.txt` or `.venv`.
2. **AI Module Directory:** `backend/app/ai/` does not exist yet.
3. **FastAPI Agent Endpoints:** No chat or agent streaming endpoints exist under `backend/app/api/v1/`.
4. **Hanoi Campus & Room Fixtures:**
   - Existing seed data is centered around Ho Chi Minh City (`hcmut-ltk`, `hcmut-da`).
   - The user specification mandates: *"Users can search for Hanoi rental rooms in natural Vietnamese. Agent can run using mock Hanoi repository. Agent can switch to PostgreSQL repository without graph changes."*
   - Therefore, a dual repository/fixture strategy is required: support both Hanoi mock repository fixtures (e.g. HUST, VNU, NEU in Hanoi) and the existing PostgreSQL / SQLite database records.
5. **Multi-turn Checkpointing & Isolation:** No thread checkpointing mechanism currently exists in the backend.

---

## 5. Contract Incompatibilities & Discrepancy Resolution

### 5.1 Discrepancy: Filter Model Field Naming [CONFIRMED]
- Frontend TypeScript (`06-DATA-CONTRACT.md` & `src/domain/contracts/index.ts`):
  `SearchFilters`: `campusId`, `maxPriceVnd`, `maxDistanceKm`, `minAreaM2`, `requiredAmenities`, `petAllowed`, `sortBy`.
- Backend Pydantic (`backend/app/schemas/search.py`):
  `SearchFilters(CamelModel)`: `campus_id`, `max_price_vnd`, `max_distance_km`, `min_area_m2`, `required_amenities`, `pet_allowed`, `sort_by`.
- **Resolution [CONFIRMED]**: `CamelModel` uses `alias_generator=to_camel` and `populate_by_name=True`. Payloads sent as `maxPriceVnd` or `max_price_vnd` are parsed identically, and serialized back to camelCase. No contract mismatch.

### 5.2 Discrepancy: Event Protocol [CONFIRMED & PROPOSED]
- Frontend recognizes:
  `run_started`, `preferences_extracted`, `campus_resolved`, `rooms_searched`, `distance_filtered`, `rooms_ranked`, `response_ready`, `clarification_required`, `run_failed`, `run_completed`.
- Target Agent v1 will also support backend execution markers:
  `tool_started`, `tool_completed`, `tool_failed`.
- **Resolution [PROPOSED]**:
  - The Event Mapper maps graph node transitions and tool executions directly into the existing frontend `AgentEvent` schema.
  - New event types are added to backend event schemas with full metadata in the `details` dictionary, keeping them compatible with frontend `AgentEvent.type` union.

### 5.3 Discrepancy: Frontend S01-S12 Fixtures (HCM) vs Prompt Requirement (Hanoi) [CONFIRMED & PROPOSED]
- Frontend tests in `src/tests/scenarios.test.ts` rely on S01 (`hcmut-ltk`, Bách Khoa TP.HCM).
- Prompt Acceptance Criteria 1 & 10 require Hanoi discovery and Hanoi mock repository.
- **Resolution [PROPOSED]**:
  - Provide an `AgentRepositoryRegistry` supporting `AGENT_REPOSITORY_MODE`:
    - `postgres`: Queries existing database via `RoomService` / `CampusService` (which has seeded demo data).
    - `mock_hanoi`: In-memory Hanoi repository with Hanoi universities (ĐH Bách Khoa Hà Nội `hust-hanoi`, ĐH Quốc Gia Hà Nội `vnu-hanoi`, ĐH Kinh Tế Quốc Dân `neu-hanoi`) and 12+ Hanoi room fixtures.
    - `mock_hybrid` (default for local dev): Merges Hanoi and HCM fixtures so BOTH prompt S01 (HCMUT) and Hanoi prompts work deterministically.
  - Neither graph nodes nor tools have any hardcoded city dependencies.

---

## 6. Proposed Module Structure [PROPOSED]

Adapting to the existing repository conventions without creating speculative abstractions:

```
backend/
├── app/
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── config.py                 # AI-specific configuration & environment settings
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── intent.py             # UserIntent enum, ExtractedRequest
│   │   │   ├── filters.py            # FilterOperation, FilterOpType enum
│   │   │   ├── state.py              # AgentGraphState, EphemeralState
│   │   │   ├── events.py             # SSE AgentEvent, EventType, EventStatus
│   │   │   └── responses.py          # AgentChatRequest, AgentChatResponse
│   │   ├── state/
│   │   │   ├── __init__.py
│   │   │   ├── filter_ops.py         # merge_filter_operations() pure deterministic logic
│   │   │   └── checkpointer.py       # LangGraph MemorySaver / Postgres checkpointer provider
│   │   ├── graph/
│   │   │   ├── __init__.py
│   │   │   ├── builder.py            # StateGraph builder and workflow definition
│   │   │   └── routing.py            # Conditional routing functions (deterministic)
│   │   ├── nodes/
│   │   │   ├── __init__.py
│   │   │   ├── understand_request.py # Call LLM 1 or fallback to extract intent & ops
│   │   │   ├── update_preferences.py # Merge filter operations deterministically
│   │   │   ├── resolve_location.py   # Campus resolution & ambiguity check
│   │   │   ├── search_rooms.py       # Execute search via repository adapter
│   │   │   ├── room_detail.py        # Fetch details for specific room ID
│   │   │   ├── compare_rooms.py      # Compare 2-3 room records
│   │   │   ├── suggest_relaxations.py# Search relaxation candidates on zero results
│   │   │   ├── clarification.py      # Prepare structured clarification questions
│   │   │   └── generate_response.py  # Call LLM 2 to generate grounded Vietnamese response
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── campus_tool.py        # resolve_campus adapter
│   │   │   ├── search_tool.py        # search_rooms adapter
│   │   │   ├── detail_tool.py        # get_room_details adapter
│   │   │   ├── compare_tool.py       # compare_rooms adapter
│   │   │   └── relaxation_tool.py    # suggest_filter_relaxations adapter
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # Abstract BaseAgentRoomRepository
│   │   │   ├── db_repository.py      # SQLAlchemy/PostGIS adapter using existing RoomService
│   │   │   ├── hanoi_fixtures.py     # Deterministic Hanoi campuses and rooms
│   │   │   └── mock_hanoi_repo.py    # In-memory mock Hanoi repository
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── client.py             # OpenAI / ChatOpenAI factory with timeout/retry
│   │   │   ├── mock_llm.py           # Mock deterministic LLM for testing without API keys
│   │   │   ├── extractor.py          # LLM Call 1: Request understanding & filter ops extraction
│   │   │   └── response_generator.py # LLM Call 2: Grounded Vietnamese response generation
│   │   ├── prompts/
│   │   │   ├── __init__.py
│   │   │   ├── extraction_prompt.py  # System prompt & few-shots for extraction
│   │   │   └── response_prompt.py    # System prompt for grounded response generation
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── agent_service.py      # High-level service coordinating graph runs & SSE
│   │   │   └── event_mapper.py       # Maps graph node transitions to frontend AgentEvents
│   │   └── evaluation/
│   │       ├── datasets/
│   │       │   └── vi_scenarios.json # Vietnamese benchmark test suite
│   │       └── evaluator.py          # Benchmark runner for intent, filters, grounding
│   └── api/
│       └── v1/
│           └── agent.py              # POST /agent/chat, POST /agent/chat/stream, GET /conversations/{id}
└── tests/
    └── ai/
        ├── test_filter_operations.py # Pure unit tests for merge_filter_operations
        ├── test_vietnamese_units.py  # Normalization tests (3 triệu, 2tr5, 500k, 2km)
        ├── test_routing.py           # LangGraph deterministic routing tests
        ├── test_tools.py             # Tool adapters tests against repositories
        ├── test_conversation.py      # Multi-turn context preservation tests
        ├── test_events.py            # SSE streaming event contract & sequence tests
        ├── test_grounding.py         # Hallucination & ungrounded claim rejection tests
        └── test_failures.py          # OpenAI timeout, empty response, and repo error tests
```

---

## 7. Required LangGraph Workflow [PROPOSED]

### 7.1 Graph Topology

```
                  [START]
                     │
                     ▼
             understand_request (LLM 1 / Mock Extractor)
                     │
                     ▼
             update_preferences (Deterministic merge_filter_operations)
                     │
                     ▼
              route_by_intent
              /      |       \                   \
             /       |        \                   \
   [search/refine] [detail] [compare]      [clarify / unsupported]
         │           │        │                    │
         ▼           │        │                    ▼
  resolve_location   │        │               clarification
      /     \        │        │                    │
[ambig/    [valid]   │        │                    │
missing]     │       │        │                    │
  │          ▼       │        │                    │
  │     search_rooms │        │                    │
  │        /     \   │        │                    │
  │   [hits>0] [zero]│        │                    │
  │      │       │   │        │                    │
  │      │       ▼   │        │                    │
  │      │   suggest_│        │                    │
  │      │  relaxations       │                    │
  │      │       │   │        │                    │
  │      ▼       ▼   │        │                    │
  │    rank_results  │        │                    │
  │          \       │        │                    │
  │           \      ▼        ▼                    │
  │         get_room_details compare_rooms         │
  │                  \        /                    │
  └───────────────────\──────/─────────────────────┘
                         │
                         ▼
                  generate_response (LLM 2 / Grounded Generator)
                         │
                         ▼
                       [END]
```

### 7.2 Node Responsibilities & Invariants

1. **`understand_request`**:
   - Input: User message, previous conversation context, current canonical filters.
   - Action: Extracts intent (`search`, `refine`, `room_detail`, `compare`, `clarify`, `general_question`, `unsupported`), explicit filter operations, target room IDs, and campus alias.
   - Invariant: Does **not** mutate filters directly; outputs structured `ExtractedRequest`.
2. **`update_preferences`**:
   - Input: Current canonical filters + extracted filter operations.
   - Action: Executes pure deterministic `merge_filter_operations()`.
   - Invariant: Completely deterministic, testable without LLM.
3. **`resolve_location`**:
   - Input: Campus query, resolved campus ID from filters, location aliases.
   - Action: Calls `CampusTool`. If campus is omitted and search requires distance, or multiple campuses match, sets `needs_clarification = True`.
4. **`search_rooms`**:
   - Input: Validated `SearchFilters`.
   - Action: Calls `SearchTool` against the repository (`RoomService` or mock repository).
   - Invariant: Hard filters are enforced at the repository level. Never fabricates rooms.
5. **`suggest_relaxations`**:
   - Trigger: Search returned 0 rooms.
   - Action: Deterministically queries candidate relaxations (e.g. increase budget to nearest tier, expand radius to 3 km) with actual candidate counts.
   - Invariant: Does **not** auto-apply relaxations to canonical filters.
6. **`room_detail`**:
   - Action: Calls `DetailTool` for the target room ID.
   - Invariant: Returns existing room record or sets error; never invents missing fields.
7. **`compare_rooms`**:
   - Action: Calls `CompareTool` for 2–3 room IDs.
   - Invariant: Builds deterministic side-by-side comparison table; marks missing values as unknown.
8. **`clarification`**:
   - Action: Prepares a polite Vietnamese clarification prompt for ambiguous campus or unsupported request.
9. **`generate_response`**:
   - Input: User message, validated filters, tool outputs, room records.
   - Action: LLM Call 2 synthesizes natural Vietnamese summary strictly grounded in factual tool results.
   - Invariant: Never fabricates prices, availability, or coordinates.

---

## 8. State Schemas & Memory Isolation [PROPOSED]

### 8.1 State Separation Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │          LangGraph Checkpointed State        │
                       │           (Persisted Across Turns)           │
                       │                                              │
                       │  - thread_id: str                            │
                       │  - messages: List[BaseMessage]               │
                       │  - canonical_filters: SearchFilters          │
                       │  - active_campus_id: Optional[str]           │
                       │  - last_result_room_ids: List[str]           │
                       │  - selected_room_id: Optional[str]           │
                       │  - compared_room_ids: List[str]              │
                       └──────────────────────┬───────────────────────┘
                                              │
                        Reset at start of     │ Preserved across
                        each turn             │ turn boundary
                                              │
                       ┌──────────────────────▼───────────────────────┐
                       │           Ephemeral Execution State          │
                       │             (Reset On Each Turn)             │
                       │                                              │
                       │  - run_id: str                               │
                       │  - intent: UserIntent                        │
                       │  - extracted_operations: List[FilterOp]      │
                       │  - tool_events: List[AgentEvent]             │
                       │  - search_result: Optional[SearchResult]     │
                       │  - detail_result: Optional[RoomView]         │
                       │  - comparison_result: Optional[Comparison]   │
                       │  - relaxation_options: List[Relaxation]      │
                       │  - clarification_question: Optional[str]     │
                       │  - error: Optional[str]                      │
                       └──────────────────────────────────────────────┘
```

### 8.2 Pydantic & TypedDict Definitions

```python
from typing import Annotated, Dict, List, Optional, Any
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from app.schemas.search import SearchFilters, SearchResult
from app.schemas.room import RoomView

class FilterOpType(str, Enum):
    SET = "set"
    REMOVE = "remove"
    ADD = "add"
    CLEAR = "clear"
    RESET_ALL = "reset_all"

class FilterOperation(BaseModel):
    op: FilterOpType
    field: str
    value: Optional[Any] = None

class AgentGraphState(TypedDict):
    # Persistent State
    thread_id: str
    messages: List[Dict[str, Any]]
    canonical_filters: SearchFilters
    active_campus_id: Optional[str]
    last_result_room_ids: List[str]
    selected_room_id: Optional[str]
    compared_room_ids: List[str]

    # Ephemeral State (Current Run)
    run_id: str
    user_message: str
    intent: str
    extracted_operations: List[Dict[str, Any]]
    target_room_ids: List[str]
    search_result: Optional[Dict[str, Any]]
    detail_result: Optional[Dict[str, Any]]
    comparison_result: Optional[Dict[str, Any]]
    relaxation_options: List[Dict[str, Any]]
    clarification_question: Optional[str]
    final_response_text: Optional[str]
    events: List[Dict[str, Any]]
    error: Optional[str]
```

---

## 9. Filter Operations Contract & Merging Rules [PROPOSED]

### 9.1 Supported Operations
- `set`: Sets or overwrites the field (`max_price_vnd`, `max_distance_km`, `min_area_m2`, `pet_allowed`, `campus_id`, `sort_by`).
- `remove`: Removes a specific element (e.g. `air_conditioner` from `required_amenities`).
- `add`: Adds an element without duplication (e.g. `wifi` into `required_amenities`).
- `clear`: Clears the specified field back to default/null (e.g. clearing `max_distance_km`).
- `reset_all`: Resets all filters to initial default state.

### 9.2 Merge Invariants (`merge_filter_operations`)
1. **Purity:** Pure deterministic Python function with 0 external dependencies.
2. **Preservation:** Unmentioned fields remain unmodified.
3. **No-Duplication:** `add` on `required_amenities` guarantees unique enum values.
4. **Distinction:** `pet_allowed=None` (any/unknown) vs `pet_allowed=True` (must allow) vs `pet_allowed=False` (no pets).
5. **No Hallucinated Inference:** Omission of an amenity does **not** mean the room must not have it.

---

## 10. OpenAI Integration Strategy [PROPOSED]

### 10.1 Two-Call LLM Architecture
To minimize latency, cost, and hallucination risk, the system limits LLM invocations to at most 2 calls per conversational turn:

1. **LLM Call 1 — Request Understanding & Extraction:**
   - **Model:** `gpt-4o-mini` (or `gpt-4o` configurable via `OPENAI_MODEL`).
   - **Method:** OpenAI Structured Outputs (`response_format=PydanticSchema`).
   - **Prompt:** Vietnamese extraction prompt with schema boundaries, campus alias dictionary, and few-shot examples for unit normalization.
   - **Output Schema:**
     ```python
     class ExtractedRequest(BaseModel):
         intent: UserIntent
         operations: List[FilterOperation]
         campus_query: Optional[str] = None
         target_room_ids: List[str] = Field(default_factory=list)
         room_reference_index: Optional[int] = None # e.g. "phòng đầu tiên" -> 0
         needs_clarification: bool = False
         clarification_reason: Optional[str] = None
     ```

2. **LLM Call 2 — Grounded Vietnamese Response Generation:**
   - **Input:**
     - User request.
     - Validated canonical filters.
     - Verified search hits (room titles, prices, distances, match reasons, caveats).
     - Known vs unknown attributes disclosure.
   - **Grounding Guardrails:**
     - Must only cite room IDs present in `verified_room_ids`.
     - Explicitly forbidden from stating room availability as guaranteed.
     - Must explicitly mention unknown attributes (e.g. "tiền điện nước chưa rõ").
     - Cannot mention fabricated addresses or landlord phone numbers.

### 10.2 Vietnamese Unit Normalization
Vietnamese currency and distance expressions are handled by a combined two-tier strategy:
1. LLM few-shots teach canonical representations.
2. Deterministic post-extraction normalization functions validate and normalize values:
   - `3 triệu` / `3tr` / `3 củ` → `3000000`
   - `2,5 triệu` / `2.5tr` / `2tr5` → `2500000`
   - `500k` / `500 ngàn` → `500000`
   - `2 km` / `2 cây số` / `2km` → `2.0`
   - `500m` → `0.5`
   - `20m2` / `20 mét vuông` → `20.0`

### 10.3 Configuration & Resilience
Configured via `app/ai/config.py`:
- `OPENAI_API_KEY`: Secret string, never logged, never returned in DTOs.
- `OPENAI_MODEL`: Default `gpt-4o-mini`.
- `OPENAI_TIMEOUT_SECONDS`: Default `15.0`.
- `OPENAI_MAX_RETRIES`: Default `2`.
- `AGENT_REPOSITORY_MODE`: `mock_hybrid` | `mock_hanoi` | `postgres`.
- Exponential backoff retry on transient HTTP 429 / 5xx; fallback to user-friendly Vietnamese error event on timeout or unrecoverable error.

---

## 11. Tool Contracts & Business Service Integration [PROPOSED]

All tools wrap existing business services or mock repositories with strict type signatures:

### Tool 1: `resolve_campus`
- **Signature:** `resolve_campus(query: str, repo: BaseAgentRoomRepository) -> CampusResolutionResult`
- **Output:** `campus_id`, `canonical_name`, `latitude`, `longitude`, `is_ambiguous`, `candidates`.
- **Policy:** Never geocodes blindly. Queries registered campuses. If ambiguous (e.g. "Bách Khoa" matching both LTK and Dĩ An), returns candidates for clarification.

### Tool 2: `search_rooms`
- **Signature:** `search_rooms(filters: SearchFilters, repo: BaseAgentRoomRepository) -> SearchResult`
- **Output:** `SearchResult` with `hits`, `applied_filters`, `total_matched`.
- **Policy:** Calls `RoomService.search_rooms()` or `MockHanoiRepository.search_rooms()`. Enforces hard filters for price, distance, area, amenities, and pets.

### Tool 3: `get_room_details`
- **Signature:** `get_room_details(room_id: str, repo: BaseAgentRoomRepository) -> Optional[RoomView]`
- **Output:** Detailed room record or `None`.

### Tool 4: `compare_rooms`
- **Signature:** `compare_rooms(room_ids: List[str], repo: BaseAgentRoomRepository) -> RoomComparisonResult`
- **Output:** Tabular attribute comparison (price, area, straight-line distance, amenities, known/unknown fees).
- **Policy:** Missing data shown as "Chưa có thông tin". Does not fabricate a winner.

### Tool 5: `suggest_filter_relaxations`
- **Signature:** `suggest_filter_relaxations(filters: SearchFilters, repo: BaseAgentRoomRepository) -> List[RelaxationSuggestion]`
- **Output:** Candidate relaxation proposals with **real, verified query counts**:
  - Proposal A: Increase max price by 500,000 VND (e.g. 2 matches).
  - Proposal B: Increase radius by 1.0 km (e.g. 3 matches).
- **Policy:** Never silently applies relaxation to user filters.

---

## 12. Streaming Event Protocol (SSE) & API Contracts [PROPOSED]

### 12.1 Endpoints
1. `POST /api/v1/agent/chat`: Synchronous execution returning complete `AgentReply`.
2. `POST /api/v1/agent/chat/stream`: Server-Sent Events (SSE) streaming execution events in real time.
3. `GET /api/v1/agent/conversations/{thread_id}`: Retrieves conversation state and message history.

### 12.2 SSE Event Stream Sequence
For a normal search run, events are emitted with strictly monotonically increasing sequence IDs:
1. `seq=1, type="run_started"`
2. `seq=2, type="preferences_extracted"`
3. `seq=3, type="campus_resolved"`
4. `seq=4, type="rooms_searched"`
5. `seq=5, type="distance_filtered"`
6. `seq=6, type="rooms_ranked"`
7. `seq=7, type="response_ready"`
8. `seq=8, type="run_completed"`

Terminal alternative events:
- `clarification_required` (terminal)
- `run_failed` (terminal)

Every event adheres to the frontend `AgentEvent` interface:
```json
{
  "id": "evt-run_123-1",
  "runId": "run_123",
  "type": "rooms_searched",
  "status": "success",
  "label": "Tìm kiếm phòng trong cơ sở dữ liệu",
  "timestamp": "2026-10-12T09:40:00Z",
  "durationMs": 45,
  "isSimulation": false,
  "details": {
    "totalFound": 3,
    "appliedFilters": { "maxPriceVnd": 3000000 }
  }
}
```

---

## 13. Testing Strategy & Quality Gates [PROPOSED]

### 13.1 Unit Testing (`backend/tests/ai/`)
1. **`test_filter_operations.py`:**
   - 100% pure unit test of `merge_filter_operations()`.
   - Tests `set`, `remove`, `add`, `clear`, `reset_all`, multi-turn accumulation, and contradiction handling without network or LLM.
2. **`test_vietnamese_units.py`:**
   - Tests normalization of `3 triệu`, `2tr5`, `500k`, `2 km`, `500m`, `20m2`.
3. **`test_routing.py`:**
   - Tests LangGraph routing logic for all 7 intents.
4. **`test_tools.py`:**
   - Tests all 5 tools against mock repositories and `RoomService`.
5. **`test_conversation.py`:**
   - Tests multi-turn thread state persistence across turns (Turn 1 → Turn 2 → Turn 3 → Turn 4).
6. **`test_grounding.py`:**
   - Verifies that responses reference only verified room IDs and do not invent prices or coordinates.
7. **`test_failures.py`:**
   - Tests behavior on OpenAI timeout, invalid JSON, and empty tool outputs.

### 13.2 Mock LLM for CI & Offline Testing
A deterministic `MockExtractor` and `MockResponseGenerator` are provided for test suites. Tests run quickly, reliably, and without incurring OpenAI API charges or requiring internet connectivity.

### 13.3 S01–S12 Regression Verification
All 12 mock scenarios defined in `07-MOCK-SCENARIOS.md` must pass against the AI Agent:
- S01: "Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km"
- S02: "Có máy lạnh nữa"
- S03: "Cho nuôi mèo"
- S04: "Tăng ngân sách lên 3,5 triệu"
- S05: "Bỏ máy lạnh đi"
- S06: "Tìm phòng gần trường mình" (Clarification required)
- S07: "Dưới 1 triệu, có điều hòa, nuôi mèo, dưới 500m" (Zero-result & relaxation)
- S08: "Cho mình xem phòng demo-room-01" (Room detail)
- S09: "So sánh phòng 01 và 02" (Comparison)
- S10: "Phòng nào gần nhất?" (Sort by distance)
- S11: "Có phòng nào hết hạn không?" (Status unknown)
- S12: Unrelated prompt (Clarification & guidance)

---

## 14. Phase-by-Phase Implementation Order [PROPOSED]

```
Phase A: Inspection & Contracts (Current — STOP & Review)
  └── Complete repository inspection, produce AGENT-IMPLEMENTATION-PLAN.md, verify quality gates.
Phase B: Agent Foundation & Core Mechanics
  ├── Install/configure dependencies (langgraph, openai, langchain-openai).
  ├── Implement app/ai/schemas/, app/ai/state/, merge_filter_operations().
  ├── Implement repositories (mock_hanoi_repo.py, hanoi_fixtures.py, db_repository.py).
  ├── Implement graph builder, nodes, and deterministic routing.
  └── Add unit tests for filter ops, routing, and state transitions.
Phase C: OpenAI Client & Structured Extractor
  ├── Implement app/ai/llm/ (client.py, extractor.py, response_generator.py).
  ├── Implement Vietnamese prompt engineering & unit normalizers.
  ├── Implement bounded retries, timeout handling, and fallback behavior.
  └── Add test_vietnamese_units.py, test_failures.py.
Phase D: Tool Integration & Grounding Verification
  ├── Connect tools to RoomService, CampusService, and Hanoi repositories.
  ├── Enforce zero-result relaxation with real query counts.
  ├── Implement comparison builder and detail provider.
  └── Add test_tools.py, test_grounding.py.
Phase E: Checkpointing, Streaming & FastAPI Endpoints
  ├── Implement LangGraph memory saver checkpointing.
  ├── Implement EventMapper and SSE streaming endpoint POST /api/v1/agent/chat/stream.
  ├── Mount router in backend/app/main.py.
  └── Add test_events.py, test_conversation.py.
Phase F: Evaluation, Regression & Acceptance Verification
  ├── Run Vietnamese evaluation benchmark (vi_scenarios.json).
  ├── Validate scenarios S01, S02, S06, S07, S09.
  ├── Run backend pytest (all tests passing) and frontend vitest.
  └── Final delivery documentation.
```

---

## 15. Questions & Items Requiring User Approval [UNKNOWN]

Prior to beginning code implementation in Phase B, we request user confirmation on the following design choices:

1. **Dependency Installation:**
   - May we add `langgraph>=0.2.0`, `langchain-openai>=0.2.0`, and `openai>=1.50.0` to `backend/requirements.txt` and install them in the active virtual environment `.venv`?
2. **City Scope & Campus Fixtures:**
   - The frontend currently has HCMUT fixtures (`hcmut-ltk`, `hcmut-da`), whereas the ingestion module and acceptance criteria specify Hanoi (`hust-hanoi`, `vnu-hanoi`, `neu-hanoi`).
   - We propose a **hybrid repository mode** (`mock_hybrid`) for local development that contains both Hanoi and HCMUT campuses. This allows the real agent to handle Hanoi student queries seamlessly while preserving 100% of the frontend's existing S01–S12 tests without regressions. Does this meet your requirements?
3. **OpenAI Credentials for Local Verification:**
   - When running automated test suites, the test suite will use dependency injection with a mock LLM (0 API cost, deterministic, runs in offline CI).
   - For interactive end-to-end testing with real OpenAI calls, will you provide an `OPENAI_API_KEY` in `backend/.env`, or should the agent default to `MockExtractor` when `OPENAI_API_KEY` is unset?
