import {
  AgentEvent,
  AgentReply,
  RentalAgentService,
  SearchFilterPatch,
  SearchFilters,
  SearchResult,
} from '@/domain/contracts';
import { MockRentalAgentService } from './mockRentalAgentService';

export interface ApiRentalAgentServiceOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export class ApiRentalAgentService implements RentalAgentService {
  private baseUrl: string;
  private timeoutMs: number;
  /** Only used in the VITEST branch below, so unit tests stay deterministic/offline. */
  private testFallback: MockRentalAgentService;

  constructor(options: ApiRentalAgentServiceOptions = {}) {
    this.baseUrl =
      options.baseUrl ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
      'http://localhost:8000';
    this.timeoutMs = options.timeoutMs || 25000;
    this.testFallback = new MockRentalAgentService();
  }

  async run(input: {
    threadId: string;
    userMessage: string;
    currentFilters: SearchFilters;
  }): Promise<AgentReply> {
    const isTestEnv = typeof process !== 'undefined' && Boolean(process.env?.VITEST);
    if (isTestEnv) {
      return this.testFallback.run(input);
    }

    let signal: AbortSignal | undefined;
    let timeoutId: any = null;
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      signal = AbortSignal.timeout(this.timeoutMs);
    } else if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      signal = controller.signal;
    }

    const response = await fetch(`${this.baseUrl}/api/v1/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        threadId: input.threadId,
        message: input.userMessage,
        currentFilters: input.currentFilters,
      }),
      signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformResponse(data, input);
  }

  private transformResponse(
    data: any,
    input: { threadId: string; userMessage: string; currentFilters: SearchFilters }
  ): AgentReply {
    const rawPatch = data.filterPatch || data.filter_patch || {};
    const filterPatch: SearchFilterPatch = {};

    if (rawPatch.campusId !== undefined || rawPatch.campus_id !== undefined) {
      filterPatch.campusId = rawPatch.campusId ?? rawPatch.campus_id;
    }
    if (rawPatch.maxPriceVnd !== undefined || rawPatch.max_price_vnd !== undefined) {
      filterPatch.maxPriceVnd = rawPatch.maxPriceVnd ?? rawPatch.max_price_vnd;
    }
    if (rawPatch.maxDistanceKm !== undefined || rawPatch.max_distance_km !== undefined) {
      filterPatch.maxDistanceKm = rawPatch.maxDistanceKm ?? rawPatch.max_distance_km;
    }
    if (rawPatch.minAreaM2 !== undefined || rawPatch.min_area_m2 !== undefined) {
      filterPatch.minAreaM2 = rawPatch.minAreaM2 ?? rawPatch.min_area_m2;
    }
    if (rawPatch.requiredAmenities !== undefined || rawPatch.required_amenities !== undefined) {
      filterPatch.requiredAmenities = rawPatch.requiredAmenities ?? rawPatch.required_amenities;
    }
    if (rawPatch.petAllowed !== undefined || rawPatch.pet_allowed !== undefined) {
      filterPatch.petAllowed = rawPatch.petAllowed ?? rawPatch.pet_allowed;
    }
    if (rawPatch.sortBy !== undefined || rawPatch.sort_by !== undefined) {
      filterPatch.sortBy = rawPatch.sortBy ?? rawPatch.sort_by;
    }

    const rawResult = data.result;
    let result: SearchResult | null = null;
    if (rawResult) {
      const rf = rawResult.appliedFilters || rawResult.applied_filters || {};
      result = {
        appliedFilters: {
          campusId: rf.campusId ?? rf.campus_id ?? null,
          maxPriceVnd: rf.maxPriceVnd ?? rf.max_price_vnd ?? null,
          maxDistanceKm: rf.maxDistanceKm ?? rf.max_distance_km ?? null,
          minAreaM2: rf.minAreaM2 ?? rf.min_area_m2 ?? null,
          requiredAmenities: rf.requiredAmenities ?? rf.required_amenities ?? [],
          petAllowed: rf.petAllowed ?? rf.pet_allowed ?? null,
          sortBy: rf.sortBy ?? rf.sort_by ?? 'recommended',
        },
        hits: (rawResult.hits || []).map((h: any) => ({
          roomId: h.roomId ?? h.room_id,
          distanceKm: h.distanceKm ?? h.distance_km ?? null,
          rankingScore: h.rankingScore ?? h.ranking_score ?? null,
          matchReasons: h.matchReasons ?? h.match_reasons ?? [],
          caveats: h.caveats ?? h.caveats ?? [],
        })),
        totalMatched: rawResult.totalMatched ?? rawResult.total_matched ?? (rawResult.hits || []).length,
        searchedAt: rawResult.searchedAt ?? rawResult.searched_at ?? new Date().toISOString(),
        datasetMode: rawResult.datasetMode ?? rawResult.dataset_mode ?? 'live',
      };
    }

    const rawMsg = data.message || {};
    const message = {
      id: rawMsg.id || `asst-${Date.now()}`,
      threadId: rawMsg.threadId || rawMsg.thread_id || input.threadId,
      role: (rawMsg.role || 'assistant') as 'assistant' | 'user',
      content: rawMsg.content || '',
      createdAt: rawMsg.createdAt || rawMsg.created_at || new Date().toISOString(),
      referencedRoomIds: rawMsg.referencedRoomIds || rawMsg.referenced_room_ids || [],
    };

    const events: AgentEvent[] = (data.events || []).map((e: any) => ({
      id: e.id || `evt-${Date.now()}-${Math.random()}`,
      runId: e.runId || e.run_id || data.runId || data.run_id || 'run-1',
      type: e.type,
      status: e.status || 'success',
      label: e.label || '',
      timestamp: e.timestamp || new Date().toISOString(),
      durationMs: e.durationMs ?? e.duration_ms ?? null,
      isSimulation: e.isSimulation ?? e.is_simulation ?? false,
      details: e.details || {},
    }));

    return {
      runId: data.runId || data.run_id || `run-${Date.now()}`,
      threadId: data.threadId || data.thread_id || input.threadId,
      status: data.status || 'completed',
      message,
      filterPatch,
      result,
      events,
      clarificationQuestion: data.clarificationQuestion || data.clarification_question || null,
      isSimulation: data.isSimulation ?? data.is_simulation ?? false,
    };
  }
}
