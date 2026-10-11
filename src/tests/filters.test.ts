import { describe, it, expect } from 'vitest';
import { executeSearch } from '@/features/search/utils/filterEngine';
import { MOCK_ROOMS } from '@/mocks/fixtures/rooms';
import { MOCK_CAMPUSES } from '@/mocks/fixtures/campuses';
import { INITIAL_SEARCH_FILTERS, SearchFilters } from '@/domain/contracts';

describe('filterEngine (Domain Hard Filtering Invariants)', () => {
  it('excludes rooms exceeding maxPriceVnd', () => {
    const filters: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      maxPriceVnd: 2500000,
    };

    const result = executeSearch({
      rooms: MOCK_ROOMS,
      campuses: MOCK_CAMPUSES,
      filters,
    });

    expect(result.hits.length).toBeGreaterThan(0);
    for (const hit of result.hits) {
      const room = MOCK_ROOMS.find((r) => r.id === hit.roomId)!;
      expect(room.priceMonthlyVnd).toBeLessThanOrEqual(2500000);
    }
  });

  it('excludes rooms without required amenities', () => {
    const filters: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      requiredAmenities: ['air_conditioner', 'kitchen'],
    };

    const result = executeSearch({
      rooms: MOCK_ROOMS,
      campuses: MOCK_CAMPUSES,
      filters,
    });

    expect(result.hits.length).toBeGreaterThan(0);
    for (const hit of result.hits) {
      const room = MOCK_ROOMS.find((r) => r.id === hit.roomId)!;
      expect(room.amenities).toContain('air_conditioner');
      expect(room.amenities).toContain('kitchen');
    }
  });

  it('strictly handles petAllowed policy (excludes null or false when petAllowed is true)', () => {
    const filters: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      petAllowed: true,
    };

    const result = executeSearch({
      rooms: MOCK_ROOMS,
      campuses: MOCK_CAMPUSES,
      filters,
    });

    expect(result.hits.length).toBeGreaterThan(0);
    for (const hit of result.hits) {
      const room = MOCK_ROOMS.find((r) => r.id === hit.roomId)!;
      expect(room.petAllowed).toBe(true);
    }
  });

  it('excludes rooms with missing coordinates when maxDistanceKm is strictly specified', () => {
    const filters: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      campusId: 'hcmut-ltk',
      maxDistanceKm: 2,
    };

    const result = executeSearch({
      rooms: MOCK_ROOMS,
      campuses: MOCK_CAMPUSES,
      filters,
    });

    for (const hit of result.hits) {
      const room = MOCK_ROOMS.find((r) => r.id === hit.roomId)!;
      expect(room.latitude).not.toBeNull();
      expect(room.longitude).not.toBeNull();
      expect(hit.distanceKm).not.toBeNull();
      expect(hit.distanceKm!).toBeLessThanOrEqual(2);
    }
  });

  it('excludes rooms with missing area when minAreaM2 is specified', () => {
    const filters: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      minAreaM2: 25,
    };

    const result = executeSearch({
      rooms: MOCK_ROOMS,
      campuses: MOCK_CAMPUSES,
      filters,
    });

    for (const hit of result.hits) {
      const room = MOCK_ROOMS.find((r) => r.id === hit.roomId)!;
      expect(room.areaM2).not.toBeNull();
      expect(room.areaM2!).toBeGreaterThanOrEqual(25);
    }
  });

  it('sorts correctly by price_asc', () => {
    const filters: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      sortBy: 'price_asc',
    };

    const result = executeSearch({
      rooms: MOCK_ROOMS,
      campuses: MOCK_CAMPUSES,
      filters,
    });

    for (let i = 1; i < result.hits.length; i++) {
      const prev = MOCK_ROOMS.find((r) => r.id === result.hits[i - 1].roomId)!;
      const curr = MOCK_ROOMS.find((r) => r.id === result.hits[i].roomId)!;
      expect(prev.priceMonthlyVnd).toBeLessThanOrEqual(curr.priceMonthlyVnd);
    }
  });

  it('sorts correctly by distance_asc', () => {
    const filters: SearchFilters = {
      ...INITIAL_SEARCH_FILTERS,
      campusId: 'hcmut-ltk',
      sortBy: 'distance_asc',
    };

    const result = executeSearch({
      rooms: MOCK_ROOMS,
      campuses: MOCK_CAMPUSES,
      filters,
    });

    for (let i = 1; i < result.hits.length; i++) {
      const prevDist = result.hits[i - 1].distanceKm ?? 999;
      const currDist = result.hits[i].distanceKm ?? 999;
      expect(prevDist).toBeLessThanOrEqual(currDist);
    }
  });
});
