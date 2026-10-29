export type LocationAccuracy = 'verified' | 'approximate' | 'unknown';
export type ListingStatus = 'unknown' | 'available' | 'unavailable';
export type SourceKind = 'demo' | 'authorized_listing' | 'owner_submitted' | 'crawled';
export type Amenity =
  | 'air_conditioner'
  | 'wifi'
  | 'parking'
  | 'private_bathroom'
  | 'balcony'
  | 'kitchen';

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

export type SortByOption = 'recommended' | 'price_asc' | 'distance_asc';

export interface SearchFilters {
  campusId: string | null;
  maxPriceVnd: number | null;
  maxDistanceKm: number | null;
  minAreaM2: number | null;
  requiredAmenities: Amenity[];
  petAllowed: boolean | null;
  sortBy: SortByOption;
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

export type AgentRunStatus =
  | 'idle'
  | 'extracting'
  | 'searching'
  | 'ranking'
  | 'completed'
  | 'needs_clarification'
  | 'failed';

export type AgentEventType =
  | 'run_started'
  | 'preferences_extracted'
  | 'campus_resolved'
  | 'rooms_searched'
  | 'distance_filtered'
  | 'rooms_ranked'
  | 'response_ready'
  | 'clarification_required'
  | 'run_failed'
  | 'run_completed';

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

export const INITIAL_SEARCH_FILTERS: SearchFilters = {
  campusId: null,
  maxPriceVnd: null,
  maxDistanceKm: null,
  minAreaM2: null,
  requiredAmenities: [],
  petAllowed: null,
  sortBy: 'recommended',
};
