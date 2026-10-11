# 08 — Technical Architecture: Frontend-first

## Stack
React + TypeScript + Vite; Tailwind CSS + shadcn/ui; React Router; React Leaflet + Leaflet and an appropriately licensed/attributed tile provider; TanStack Query; Vitest + Testing Library, Playwright optional. Strict TS; no backend service in current phase.

## Data flow
User composer → `RentalAgentService.run` (mock) → `AgentReply` → canonical `searchStore` updates → selectors derive room IDs → room list/map display. Explicit filter controls also write to `searchStore` and trigger local mock filtering. Selected room ID shared across map and cards. Router renders `/rooms/:id` using RoomRepository adapter.

## Folder structure
```text
frontend/
├── src/
│   ├── app/{routes,providers,store}/
│   ├── features/
│   │   ├── home/
│   │   ├── chat/{components,hooks}/
│   │   ├── search/{components,utils}/
│   │   ├── map/{components,utils}/
│   │   ├── rooms/{components}/
│   │   └── trace/{components}/
│   ├── domain/{contracts,selectors}/
│   ├── services/{agent,rooms,adapters}/
│   ├── mocks/{fixtures,scenarios}/
│   ├── shared/{ui,utils}/
│   └── tests/
├── package.json
└── vite.config.ts
```

## Layer boundaries
- `domain/contracts`: only types and validations, no React or HTTP.
- `services/agent`: interface + mock implementation; future API adapter.
- `services/rooms`: fixture repository with `getById`, `list` and validated objects.
- `features/search`: selectors/filtering; business rules tested in isolation.
- `features/map`: receives data and callbacks, **never** independently filters database.
- `features/chat`: displays messages/events, calls service using current canonical filter state.
- `features/trace`: renders sanitized event data; no chain-of-thought.

## Shared state recommendation
Use a small store (Zustand or React context/reducer); one source of truth for `currentFilters`, `lastSearchResult`, `selectedRoomId`, `messages`, `events`, `runStatus`. Derive `visibleRoomViews` from search hit IDs + RoomRepository. TanStack Query intended for future async data fetching; avoid unnecessary dual caches of same data.

## Geospatial implementation
Frontend mock uses Haversine (earth radius ~6371 km) computed from known campus and room coordinates. For actual backend move filtering to PostGIS and compare `distanceKm` results; map uses coordinates only and renders radius circle around campus. No routing/road-distance API.

## Image strategy
Use local demo placeholders or appropriately licensed sample images; responsive `<img loading=lazy>`; placeholder on failure; `alt` based on known room title, no invented descriptive facts. Do not hotlink scraped third-party images without permission.

## Future FastAPI migration
Implement `ApiRentalAgentService` that converts backend DTOs into versioned `AgentReply` and events, and `ApiRoomRepository` for rooms. Preserve `RoomView` and `SearchFilters` in frontend. Introduce backend schema migration separately; do not leak persistence fields into components. SSE later for true tool events; include request/run IDs and cancellation.

## Quality gates
`npm run typecheck`, `npm run test`, `npm run build`; verify responsive layouts; a11y scan; smoke flows S01–S12. CI job optional. Prevent unauthorized data collection or false verification labels.

## Implementation slices
1. Scaffold and tokens/routes.
2. Typed contracts + fixtures + Haversine + filter unit tests.
3. Map + cards + selection sync.
4. Chat + scenario mock agent + event timeline.
5. Room Insight and trace.
6. Mobile, edge states, tests, deploy static frontend.
