import { create } from 'zustand';
import {
  AgentEvent,
  AgentRunStatus,
  Amenity,
  Campus,
  ChatMessage,
  INITIAL_SEARCH_FILTERS,
  RoomSearchHit,
  RoomView,
  SearchFilterPatch,
  SearchFilters,
  SearchResult,
} from '@/domain/contracts';
import { executeSearch } from '@/features/search/utils/filterEngine';
import { rentalAgentService } from '@/services/agent';
import { roomRepository } from '@/services/rooms';

export interface SearchStoreState {
  // Canonical data
  currentFilters: SearchFilters;
  lastSearchResult: SearchResult | null;
  selectedRoomId: string | null;
  comparingRoomIds: string[];
  messages: ChatMessage[];
  events: AgentEvent[];
  runStatus: AgentRunStatus;

  // Cached fixture collections
  allRooms: RoomView[];
  allCampuses: Campus[];

  // UI state
  isTraceOpen: boolean;
  mobileTab: 'chat' | 'map' | 'rooms';
  isLoadingRooms: boolean;

  // Actions
  initData: () => Promise<void>;
  sendUserMessage: (content: string) => Promise<void>;
  updateFilters: (patch: SearchFilterPatch) => void;
  removeFilter: (field: keyof SearchFilters, amenityValue?: Amenity) => void;
  setSelectedRoomId: (id: string | null) => void;
  toggleCompareRoom: (id: string) => void;
  clearComparison: () => void;
  setTraceOpen: (open: boolean) => void;
  setMobileTab: (tab: 'chat' | 'map' | 'rooms') => void;
  resetFilters: () => void;
}

export const useSearchStore = create<SearchStoreState>((set, get) => ({
  currentFilters: { ...INITIAL_SEARCH_FILTERS },
  lastSearchResult: null,
  selectedRoomId: null,
  comparingRoomIds: [],
  messages: [],
  events: [],
  runStatus: 'idle',

  allRooms: [],
  allCampuses: [],

  isTraceOpen: false,
  mobileTab: 'chat',
  isLoadingRooms: true,

  initData: async () => {
    const [rooms, campuses] = await Promise.all([
      roomRepository.list(),
      roomRepository.listCampuses(),
    ]);

    // Initial search with default campus (HCMUT LTK) if empty
    const initialFilters: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      campusId: 'hcmut-ltk',
    };

    const initialResult = executeSearch({
      rooms,
      campuses,
      filters: initialFilters,
    });

    set({
      allRooms: rooms,
      allCampuses: campuses,
      currentFilters: initialFilters,
      lastSearchResult: initialResult,
      isLoadingRooms: false,
    });
  },

  sendUserMessage: async (content: string) => {
    const text = content.trim();
    if (!text) return;

    const threadId = 'default-thread';
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      threadId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      referencedRoomIds: [],
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      runStatus: 'extracting',
    }));

    try {
      const currentFilters = get().currentFilters;
      const reply = await rentalAgentService.run({
        threadId,
        userMessage: text,
        currentFilters,
      });

      // Compute new filter state
      const updatedFilters: SearchFilters = {
        ...currentFilters,
        ...reply.filterPatch,
        requiredAmenities:
          reply.filterPatch.requiredAmenities !== undefined
            ? reply.filterPatch.requiredAmenities
            : currentFilters.requiredAmenities,
      };

      // Handle comparison triggering in S09
      let comparing = get().comparingRoomIds;
      if (
        (text.toLowerCase().includes('so sánh') || text.toLowerCase().includes('compare')) &&
        reply.message.referencedRoomIds.length >= 2
      ) {
        comparing = reply.message.referencedRoomIds.slice(0, 3);
      }

      set((state) => ({
        currentFilters: updatedFilters,
        lastSearchResult: reply.result ?? state.lastSearchResult,
        selectedRoomId:
          reply.message.referencedRoomIds.length > 0
            ? reply.message.referencedRoomIds[0]
            : state.selectedRoomId,
        comparingRoomIds: comparing,
        messages: [...state.messages, reply.message],
        events: reply.events,
        runStatus: reply.status,
      }));
    } catch {
      set({
        runStatus: 'failed',
      });
    }
  },

  updateFilters: (patch: SearchFilterPatch) => {
    const { currentFilters, allRooms, allCampuses } = get();
    const updatedFilters: SearchFilters = {
      ...currentFilters,
      ...patch,
      requiredAmenities:
        patch.requiredAmenities !== undefined
          ? patch.requiredAmenities
          : currentFilters.requiredAmenities,
    };

    const newResult = executeSearch({
      rooms: allRooms,
      campuses: allCampuses,
      filters: updatedFilters,
    });

    set({
      currentFilters: updatedFilters,
      lastSearchResult: newResult,
    });
  },

  removeFilter: (field: keyof SearchFilters, amenityValue?: Amenity) => {
    const { currentFilters, allRooms, allCampuses } = get();
    const updated = { ...currentFilters };

    if (field === 'requiredAmenities' && amenityValue) {
      updated.requiredAmenities = updated.requiredAmenities.filter((a) => a !== amenityValue);
    } else if (field === 'requiredAmenities') {
      updated.requiredAmenities = [];
    } else if (field === 'maxPriceVnd') {
      updated.maxPriceVnd = null;
    } else if (field === 'maxDistanceKm') {
      updated.maxDistanceKm = null;
    } else if (field === 'minAreaM2') {
      updated.minAreaM2 = null;
    } else if (field === 'petAllowed') {
      updated.petAllowed = null;
    } else if (field === 'campusId') {
      updated.campusId = null;
    } else if (field === 'sortBy') {
      updated.sortBy = 'recommended';
    }

    const newResult = executeSearch({
      rooms: allRooms,
      campuses: allCampuses,
      filters: updated,
    });

    set({
      currentFilters: updated,
      lastSearchResult: newResult,
    });
  },

  setSelectedRoomId: (id: string | null) => {
    set({ selectedRoomId: id });
  },

  toggleCompareRoom: (id: string) => {
    set((state) => {
      const exists = state.comparingRoomIds.includes(id);
      if (exists) {
        return { comparingRoomIds: state.comparingRoomIds.filter((item) => item !== id) };
      }
      if (state.comparingRoomIds.length >= 3) {
        return state; // maximum 3 rooms
      }
      return { comparingRoomIds: [...state.comparingRoomIds, id] };
    });
  },

  clearComparison: () => {
    set({ comparingRoomIds: [] });
  },

  setTraceOpen: (open: boolean) => {
    set({ isTraceOpen: open });
  },

  setMobileTab: (tab: 'chat' | 'map' | 'rooms') => {
    set({ mobileTab: tab });
  },

  resetFilters: () => {
    const { allRooms, allCampuses } = get();
    const defaultFilters: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      campusId: 'hcmut-ltk',
    };
    const result = executeSearch({
      rooms: allRooms,
      campuses: allCampuses,
      filters: defaultFilters,
    });
    set({
      currentFilters: defaultFilters,
      lastSearchResult: result,
      selectedRoomId: null,
      comparingRoomIds: [],
    });
  },
}));

// Selectors
export function selectVisibleRooms(
  hits: RoomSearchHit[] | undefined,
  allRooms: RoomView[]
): (RoomView & { hit: RoomSearchHit })[] {
  if (!hits) return [];
  const roomMap = new Map(allRooms.map((r) => [r.id, r]));
  return hits
    .map((hit) => {
      const room = roomMap.get(hit.roomId);
      if (!room) return null;
      return { ...room, hit };
    })
    .filter((r): r is RoomView & { hit: RoomSearchHit } => r !== null);
}
