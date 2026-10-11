# AI Rental Copilot — Business Backend (Phase 1)

**Phase 1: Business Backend** delivers the domain models, database migrations, structured search engine, representative seed fixtures, and versioned REST APIs for the AI Rental Copilot student rental discovery platform.

---

## 1. Architecture Overview

Built as a **Modular Monolith** adhering to Clean Architecture principles:

- **Domain Layer (`app/domain/`)**: ORM models (`Campus`, `Room`, `RoomImage`) and domain enums (`LocationAccuracy`, `ListingStatus`, `SourceKind`, `Amenity`, `SortByOption`).
- **Data Transfer Objects (`app/schemas/`)**: Pydantic v2 schemas using `CamelModel` (`alias_generator=to_camel`, `populate_by_name=True`), maintaining strict compatibility with frontend TypeScript contracts.
- **Repository Layer (`app/repositories/`)**: Data access encapsulation (`CampusRepository`, `RoomRepository`) with SQL query generation, PostGIS spatial support, and in-memory fallback.
- **Service Layer (`app/services/`)**: Business logic encapsulation (`CampusService`, `RoomService`, `ranking`, `distance`). Reusable directly by future LangGraph / agent workflow tools in Phase 2 without HTTP overhead.
- **API Transport Layer (`app/api/v1/`)**: Versioned REST endpoints (`/api/v1/campuses`, `/api/v1/rooms`, `/api/v1/rooms/search`, `/api/v1/health`).
- **Seed Fixtures (`app/seeds/`)**: Deterministic demo seed matching `docs/development/07-MOCK-SCENARIOS.md` with 2 campuses and 12 demo rooms, explicitly marked as simulated (`is_simulated = True`).

---

## 2. Technology Stack

- **Python**: 3.12+ (3.13 tested)
- **Web Framework**: FastAPI 0.115+
- **ASGI Server**: Uvicorn
- **ORM**: SQLAlchemy 2.0+
- **Database**: PostgreSQL 16 + PostGIS 3.4
- **Spatial Extensions**: GeoAlchemy2, Shapely
- **Migrations**: Alembic 1.13+
- **Validation & Serialization**: Pydantic v2
- **Testing**: pytest, pytest-asyncio, httpx
- **Containerization**: Docker & Docker Compose

---

## 3. API Specification (`/api/v1`)

Interactive OpenAPI Swagger UI is available at `/docs` and ReDoc at `/redoc`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Healthcheck verifying database connectivity and demo dataset mode. |
| `GET` | `/api/v1/campuses` | Retrieve list of all university campuses (`hcmut-ltk`, `hcmut-da`). |
| `GET` | `/api/v1/campuses/{id}` | Retrieve details of a specific campus. |
| `GET` | `/api/v1/rooms` | Query room listings with query filters (`campus_id`, `max_price_vnd`, `max_distance_km`, `min_area_m2`, `amenities`, `pet_allowed`, `sort_by`). |
| `POST` | `/api/v1/rooms/search` | Execute structured search accepting `SearchFilters` body, returning `SearchResult` with ranked `hits`, `matchReasons`, and `caveats`. |
| `GET` | `/api/v1/rooms/{id}` | Retrieve single room details including normalized `images`. |

### Example Search Request (`POST /api/v1/rooms/search`)
```json
{
  "campusId": "hcmut-ltk",
  "maxPriceVnd": 3000000,
  "maxDistanceKm": 2.0,
  "requiredAmenities": ["air_conditioner"],
  "petAllowed": null,
  "sortBy": "recommended"
}
```

### Example Search Response
```json
{
  "appliedFilters": {
    "campusId": "hcmut-ltk",
    "maxPriceVnd": 3000000,
    "maxDistanceKm": 2.0,
    "minAreaM2": null,
    "requiredAmenities": ["air_conditioner"],
    "petAllowed": null,
    "sortBy": "recommended"
  },
  "hits": [
    {
      "roomId": "demo-room-01",
      "distanceKm": 1.1,
      "rankingScore": 0.85,
      "matchReasons": [
        "Phù hợp ngân sách (≤ 3tr)",
        "Cách cơ sở ~1.1 km",
        "Đủ 1 tiện ích yêu cầu"
      ],
      "caveats": [
        "Vị trí ước lượng (đường chim bay)"
      ]
    }
  ],
  "totalMatched": 1,
  "searchedAt": "2026-10-11T21:00:00Z",
  "datasetMode": "demo"
}
```

---

## 4. Quick Start with Docker Compose

Run the entire stack (PostGIS + FastAPI):

```bash
docker compose up --build
```

The database will initialize, apply Alembic migrations, and auto-seed the demo fixtures.
- API root: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/v1/health`

---

## 5. Local Development Setup

### 1. Activate Virtual Environment
```bash
# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Run Migrations
```bash
cd backend
alembic upgrade head
```

### 4. Seed Representative Demo Fixtures
```bash
python -m app.seeds.seed_data
```

### 5. Start Development Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 6. Running Tests

The test suite runs with an isolated in-memory SQLite database (`StaticPool`) and validates Haversine distance geometry, strict domain filtering invariants (budget, distance, amenities, pet policy, area), scenario edge cases (S01, S07 zero-result), and REST API behavior:

```bash
cd backend
pytest -v
```

All 26 tests run in under 1 second without requiring external network access or running containers.

---

## 7. Future LangGraph Tool Reusability (Phase 2+)

In Phase 2, when implementing AI orchestration with LangGraph, tools can instantiate `RoomService` and `CampusService` directly:

```python
from app.database import SessionLocal
from app.services.room_service import RoomService
from app.schemas.search import SearchFilters

def search_rooms_tool(campus_id: str, max_price_vnd: int, max_distance_km: float):
    """LangGraph tool function."""
    with SessionLocal() as db:
        service = RoomService(db)
        filters = SearchFilters(
            campus_id=campus_id,
            max_price_vnd=max_price_vnd,
            max_distance_km=max_distance_km,
        )
        return service.search_rooms(filters)
```
No HTTP calls or duplicate SQL queries are required.
