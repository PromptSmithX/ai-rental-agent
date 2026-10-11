import { describe, it, expect } from 'vitest';
import { matchAndExecuteScenario } from '@/mocks/scenarios';
import { MOCK_ROOMS } from '@/mocks/fixtures/rooms';
import { MOCK_CAMPUSES } from '@/mocks/fixtures/campuses';
import { INITIAL_SEARCH_FILTERS, SearchFilters } from '@/domain/contracts';

describe('12 Mock Scenarios from 07-MOCK-SCENARIOS.md', () => {
  const baseInput = {
    threadId: 'test-thread',
    rooms: MOCK_ROOMS,
    campuses: MOCK_CAMPUSES,
  };

  it('S01: extracts price, campus, and radius from prompt', () => {
    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km',
      currentFilters: { ...INITIAL_SEARCH_FILTERS },
    });

    expect(reply.filterPatch.maxPriceVnd).toBe(3000000);
    expect(reply.filterPatch.campusId).toBe('hcmut-ltk');
    expect(reply.filterPatch.maxDistanceKm).toBe(2);
    expect(reply.status).toBe('completed');
    expect(reply.result?.hits.length).toBeGreaterThan(0);
    expect(reply.events.map((e) => e.type)).toContain('distance_filtered');
    expect(reply.isSimulation).toBe(true);
  });

  it('S02: adds air_conditioner while preserving existing filters', () => {
    const existing: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      campusId: 'hcmut-ltk',
      maxPriceVnd: 3000000,
      maxDistanceKm: 2,
    };

    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Có máy lạnh nữa',
      currentFilters: existing,
    });

    expect(reply.filterPatch.requiredAmenities).toContain('air_conditioner');
    // Ensure all returned hits actually have air_conditioner
    for (const hit of reply.result!.hits) {
      const room = MOCK_ROOMS.find((r) => r.id === hit.roomId)!;
      expect(room.amenities).toContain('air_conditioner');
      expect(room.priceMonthlyVnd).toBeLessThanOrEqual(3000000);
    }
  });

  it('S03: filters petAllowed: true and reruns search', () => {
    const existing: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      campusId: 'hcmut-ltk',
    };

    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Cho nuôi mèo',
      currentFilters: existing,
    });

    expect(reply.filterPatch.petAllowed).toBe(true);
    for (const hit of reply.result!.hits) {
      const room = MOCK_ROOMS.find((r) => r.id === hit.roomId)!;
      expect(room.petAllowed).toBe(true);
    }
  });

  it('S04: patches only maxPriceVnd when user asks to increase budget', () => {
    const existing: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      campusId: 'hcmut-ltk',
      maxPriceVnd: 3000000,
      maxDistanceKm: 2,
      requiredAmenities: ['air_conditioner'],
    };

    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Tăng ngân sách lên 3,5 triệu',
      currentFilters: existing,
    });

    expect(reply.filterPatch.maxPriceVnd).toBe(3500000);
    expect(reply.filterPatch.campusId).toBeUndefined();
    expect(reply.filterPatch.maxDistanceKm).toBeUndefined();
  });

  it('S05: removes air_conditioner while preserving other amenities and filters', () => {
    const existing: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      campusId: 'hcmut-ltk',
      requiredAmenities: ['air_conditioner', 'wifi'],
    };

    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Bỏ máy lạnh đi',
      currentFilters: existing,
    });

    expect(reply.filterPatch.requiredAmenities).not.toContain('air_conditioner');
    expect(reply.filterPatch.requiredAmenities).toContain('wifi');
  });

  it('S06: asks for campus clarification instead of guessing when campus is missing', () => {
    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Tìm phòng gần trường mình',
      currentFilters: { ...INITIAL_SEARCH_FILTERS, campusId: null },
    });

    expect(reply.status).toBe('needs_clarification');
    expect(reply.clarificationQuestion).toBeTruthy();
    expect(reply.events.map((e) => e.type)).toContain('clarification_required');
  });

  it('S07: returns zero results for strict impossible constraints and suggests relaxation', () => {
    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Dưới 1 triệu, có điều hòa, nuôi mèo, dưới 500m',
      currentFilters: { ...INITIAL_SEARCH_FILTERS },
    });

    expect(reply.result?.hits.length).toBe(0);
    expect(reply.message.content).toContain('Chưa có phòng mẫu nào đáp ứng');
  });

  it('S08: gets details for existing demo-room-01', () => {
    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Cho mình xem phòng demo-room-01',
      currentFilters: { ...INITIAL_SEARCH_FILTERS },
    });

    expect(reply.message.referencedRoomIds).toContain('demo-room-01');
  });

  it('S09: compares room 01 and 02 with known attributes only', () => {
    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'So sánh phòng 01 và 02',
      currentFilters: { ...INITIAL_SEARCH_FILTERS },
    });

    expect(reply.message.referencedRoomIds).toContain('demo-room-01');
    expect(reply.message.referencedRoomIds).toContain('demo-room-02');
  });

  it('S10: sorts by distance_asc for "Phòng nào gần nhất?"', () => {
    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Phòng nào gần nhất?',
      currentFilters: { ...INITIAL_SEARCH_FILTERS, campusId: 'hcmut-ltk' },
    });

    expect(reply.filterPatch.sortBy).toBe('distance_asc');
  });

  it('S11: responds that all listing statuses in mock are unknown', () => {
    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Có phòng nào hết hạn không?',
      currentFilters: { ...INITIAL_SEARCH_FILTERS },
    });

    expect(reply.message.content).toContain('Chưa rõ');
  });

  it('S12: responds with guidance and clarification for unknown text', () => {
    const reply = matchAndExecuteScenario({
      ...baseInput,
      userMessage: 'Xin chào thời tiết hôm nay thế nào',
      currentFilters: { ...INITIAL_SEARCH_FILTERS },
    });

    expect(reply.status).toBe('needs_clarification');
  });
});
