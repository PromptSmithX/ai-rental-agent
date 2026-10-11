# 06 — Frontend Data Contracts (v1, mock-first)

**Conventions:** TypeScript strict mode, IDs as strings, VND integer/month, distance in aerial kilometers, ISO 8601 timestamp strings, explicit `null` for unknown values, canonical frontend ViewModels. Contract version: `1`.

## TypeScript definitions

```ts
export type LocationAccuracy = 'verified' | 'approximate' | 'unknown';
export type ListingStatus = 'unknown' | 'available' | 'unavailable';
export type SourceKind = 'demo' | 'authorized_listing' | 'owner_submitted';
export type Amenity = 'air_conditioner' | 'wifi' | 'parking' | 'private_bathroom' | 'balcony' | 'kitchen';

export interface Campus {
  id: string;
  universityName: string;
  campusName: string;
  latitude: number;
  longitude: number;
}
export interface RoomView {
  id: string;
  title: string;
  priceMonthlyVnd: number;
  areaM2: number | null;
  imageUrls: string[];
  addressLabel: string;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: LocationAccuracy;
  amenities: Amenity[];
  petAllowed: boolean | null;
  listingStatus: ListingStatus;
  sourceKind: SourceKind;
  sourceUrl: string | null;
  lastCheckedAt: string | null;
  utilitiesMonthlyEstimateVnd: number | null;
}
export interface SearchFilters {
  campusId: string | null;
  maxPriceVnd: number | null;
  maxDistanceKm: number | null;
  minAreaM2: number | null;
  requiredAmenities: Amenity[];
  petAllowed: boolean | null;
  sortBy: 'recommended' | 'price_asc' | 'distance_asc';
}
export interface SearchFilterPatch extends Partial<Omit<SearchFilters, 'requiredAmenities'>> {
  /** Set entire required amenities list, not append */
  requiredAmenities?: Amenity[];
}
export interface RoomSearchHit {
  roomId: string;
  distanceKm: number | null;
  rankingScore: number | null; // null if not computed
  matchReasons: string[];
  caveats: string[];
}
export interface SearchResult {
  appliedFilters: SearchFilters;
  hits: RoomSearchHit[]; // order is ranking order
  totalMatched: number;
  searchedAt: string;
  datasetMode: 'demo' | 'live';
}
export type ChatRole = 'user' | 'assistant';
export interface ChatMessage {
  id: string;
  threadId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  referencedRoomIds: string[];
}
export type AgentRunStatus = 'idle' | 'extracting' | 'searching' | 'ranking' | 'completed' | 'needs_clarification' | 'failed';
export type AgentEventType =
  | 'run_started' | 'preferences_extracted' | 'campus_resolved'
  | 'rooms_searched' | 'distance_filtered' | 'rooms_ranked'
  | 'response_ready' | 'clarification_required' | 'run_failed' | 'run_completed';
export interface AgentEvent {
  id: string;
  runId: string;
  type: AgentEventType;
  status: 'pending' | 'running' | 'success' | 'error';
  label: string;
  timestamp: string;
  durationMs: number | null;
  isSimulation: boolean;
  details: Record<string, string | number | boolean | null>; // sanitized public summary
}
export interface AgentReply {
  runId: string;
  threadId: string;
  status: AgentRunStatus;
  message: ChatMessage;
  filterPatch: SearchFilterPatch;
  result: SearchResult | null;
  events: AgentEvent[];
  clarificationQuestion: string | null;
  isSimulation: boolean;
}
```

## Initial filter defaults
```json
{
  "campusId": null,
  "maxPriceVnd": null,
  "maxDistanceKm": null,
  "minAreaM2": null,
  "requiredAmenities": [],
  "petAllowed": null,
  "sortBy": "recommended"
}
```

## Mock service interface
```ts
export interface RentalAgentService {
  run(input: {
    threadId: string;
    userMessage: string;
    currentFilters: SearchFilters;
  }): Promise<AgentReply>;
}
export interface RoomRepository {
  list(): Promise<RoomView[]>;
  getById(id: string): Promise<RoomView | null>;
}
```
`MockRentalAgentService` is the only implementation for MVP. Later `ApiRentalAgentService` adapts FastAPI DTOs; React components do not change.

## Domain invariants
- `priceMonthlyVnd >= 0`, `areaM2 > 0` if non-null; `maxDistanceKm > 0` if non-null.
- Latitude is between -90 and 90, longitude -180 and 180; both present or both null.
- `locationAccuracy='unknown'` when coordinates are absent; `verified` only after independent validation, never for seed.
- `sourceKind='demo'` in mock dataset, `sourceUrl=null` unless permitted and verified.
- `listingStatus='unknown'` for mock rooms; do not show `available` badge.
- Distance derived from coordinates and campus, **never hardcoded independently** where a geocoordinate exists.
- Hard filter rules: `price <= max`; `area >= min` if supplied and known; all `requiredAmenities` present; pets true if required true, pets false if required false (if unknown exclude for strict filtering). Missing data does not pass a strict filter.
- If `maxDistanceKm` is set, exclude unknown coordinates from matched set; optionally surface them in separate `vị trí chưa rõ` section not called matches.
- Map markers only for valid coordinate pairs and eligible visible results.
- Dates are ISO strings; format locale only in view layer.

## Recommended API contract (future; not implemented now)
- `POST /api/v1/chat/runs` → AgentReply or streaming events.
- `GET /api/v1/rooms?filters=...` → SearchResult and RoomViews (or page).
- `GET /api/v1/rooms/{id}` → RoomView.
- `GET /api/v1/campuses` → Campus[].
- Planned streaming: SSE `event: agent_event` with AgentEvent payload, final `agent_reply`, and error. Version public protocol before production.

## Example result (fictional)
```json
{
  "appliedFilters": {"campusId":"hcmut-ltk","maxPriceVnd":3000000,"maxDistanceKm":2,"minAreaM2":null,"requiredAmenities":["air_conditioner"],"petAllowed":null,"sortBy":"recommended"},
  "hits": [{"roomId":"demo-room-01","distanceKm":1.4,"rankingScore":0.87,"matchReasons":["Trong ngân sách","Có máy lạnh"],"caveats":["Vị trí ước lượng"]}],
  "totalMatched":1,
  "searchedAt":"2026-10-11T09:00:00Z",
  "datasetMode":"demo"
}
```
This example is illustrative; implementation must compute hit distance from actual fixture coordinates.
