import { Campus, RoomSearchHit, RoomView, SearchFilters, SearchResult } from '@/domain/contracts';
import { calculateAirDistanceKm } from '@/shared/utils/distance';

export interface ExecuteSearchOptions {
  rooms: RoomView[];
  campuses: Campus[];
  filters: SearchFilters;
}

export function executeSearch({ rooms, campuses, filters }: ExecuteSearchOptions): SearchResult {
  const currentCampus = filters.campusId
    ? campuses.find((c) => c.id === filters.campusId) ?? null
    : null;

  const hits: RoomSearchHit[] = [];

  for (const room of rooms) {
    // 1. Calculate distance if campus is selected
    const distanceKm = currentCampus
      ? calculateAirDistanceKm(
          currentCampus.latitude,
          currentCampus.longitude,
          room.latitude,
          room.longitude
        )
      : null;

    // 2. HARD FILTER: Max price
    if (filters.maxPriceVnd !== null && room.priceMonthlyVnd > filters.maxPriceVnd) {
      continue;
    }

    // 3. HARD FILTER: Distance
    if (filters.maxDistanceKm !== null) {
      // If distance cannot be computed (missing coordinates or no campus), exclude from hard filter
      if (distanceKm === null || distanceKm > filters.maxDistanceKm) {
        continue;
      }
    }

    // 4. HARD FILTER: Min Area
    if (filters.minAreaM2 !== null) {
      if (room.areaM2 === null || room.areaM2 < filters.minAreaM2) {
        continue;
      }
    }

    // 5. HARD FILTER: Required Amenities
    if (filters.requiredAmenities && filters.requiredAmenities.length > 0) {
      const hasAllAmenities = filters.requiredAmenities.every((req) =>
        room.amenities.includes(req)
      );
      if (!hasAllAmenities) {
        continue;
      }
    }

    // 6. HARD FILTER: Pet allowed
    if (filters.petAllowed !== null) {
      if (room.petAllowed !== filters.petAllowed) {
        continue;
      }
    }

    // 7. Calculate ranking score & reasons
    let rankingScore: number | null = null;
    const matchReasons: string[] = [];
    const caveats: string[] = [];

    // Match reasons
    if (filters.maxPriceVnd !== null) {
      matchReasons.push(`Phù hợp ngân sách (≤ ${(filters.maxPriceVnd / 1_000_000).toLocaleString('vi-VN')}tr)`);
    } else {
      matchReasons.push('Giá thuê phù hợp');
    }

    if (distanceKm !== null) {
      matchReasons.push(`Cách cơ sở ~${distanceKm} km`);
    }

    if (filters.requiredAmenities.length > 0) {
      matchReasons.push(`Đủ ${filters.requiredAmenities.length} tiện ích yêu cầu`);
    }

    if (filters.petAllowed === true && room.petAllowed === true) {
      matchReasons.push('Cho phép nuôi thú cưng');
    }

    // Caveats
    if (room.locationAccuracy === 'approximate') {
      caveats.push('Vị trí ước lượng (đường chim bay)');
    } else if (room.locationAccuracy === 'unknown') {
      caveats.push('Chưa có tọa độ chính xác');
    }

    if (room.utilitiesMonthlyEstimateVnd === null) {
      caveats.push('Chưa rõ chi phí điện nước phát sinh');
    }

    if (room.areaM2 === null) {
      caveats.push('Chưa rõ diện tích thực tế');
    }

    // Scoring formula (illustrative deterministic formula)
    // 0.40 distance score + 0.35 budget headroom + 0.25 amenity overlap
    const maxBudget = filters.maxPriceVnd ?? 5_000_000;
    const budgetHeadroom = Math.max(0, Math.min(1, (maxBudget - room.priceMonthlyVnd) / maxBudget));
    const distanceScore = distanceKm !== null ? Math.max(0, Math.min(1, 1 - distanceKm / 5)) : 0.5;
    const amenityOverlap = room.amenities.length / 6;

    rankingScore = Math.round((0.4 * distanceScore + 0.35 * budgetHeadroom + 0.25 * amenityOverlap) * 100) / 100;

    hits.push({
      roomId: room.id,
      distanceKm,
      rankingScore,
      matchReasons,
      caveats,
    });
  }

  // Sorting
  if (filters.sortBy === 'price_asc') {
    hits.sort((a, b) => {
      const roomA = rooms.find((r) => r.id === a.roomId)!;
      const roomB = rooms.find((r) => r.id === b.roomId)!;
      return roomA.priceMonthlyVnd - roomB.priceMonthlyVnd;
    });
  } else if (filters.sortBy === 'distance_asc') {
    hits.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  } else {
    // 'recommended'
    hits.sort((a, b) => (b.rankingScore ?? 0) - (a.rankingScore ?? 0));
  }

  return {
    appliedFilters: { ...filters },
    hits,
    totalMatched: hits.length,
    searchedAt: new Date().toISOString(),
    datasetMode: 'live',
  };
}
