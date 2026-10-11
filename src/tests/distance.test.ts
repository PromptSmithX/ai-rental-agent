import { describe, it, expect } from 'vitest';
import { calculateAirDistanceKm, formatDistanceVi } from '@/shared/utils/distance';

describe('calculateAirDistanceKm (Haversine formula)', () => {
  it('returns 0 when coordinates are identical', () => {
    const lat = 10.7721;
    const lon = 106.6579;
    expect(calculateAirDistanceKm(lat, lon, lat, lon)).toBe(0);
  });

  it('calculates straight-line km correctly between known HCMUT and nearby point', () => {
    // HCMUT LTK: 10.7721, 106.6579
    // Room 01: 10.7635, 106.6625 (~1.1 km)
    const dist = calculateAirDistanceKm(10.7721, 106.6579, 10.7635, 106.6625);
    expect(dist).toBeGreaterThan(0.9);
    expect(dist).toBeLessThan(1.3);
  });

  it('calculates distance between HCMUT LTK and HCMUT DA accurately (~20 km)', () => {
    // LTK: 10.7721, 106.6579; DA: 10.8805, 106.8054
    const dist = calculateAirDistanceKm(10.7721, 106.6579, 10.8805, 106.8054);
    expect(dist).toBeGreaterThan(18);
    expect(dist).toBeLessThan(22);
  });

  it('returns null if any coordinate is null', () => {
    expect(calculateAirDistanceKm(null, 106.6579, 10.7721, 106.6579)).toBeNull();
    expect(calculateAirDistanceKm(10.7721, null, 10.7721, 106.6579)).toBeNull();
    expect(calculateAirDistanceKm(10.7721, 106.6579, null, 106.6579)).toBeNull();
    expect(calculateAirDistanceKm(10.7721, 106.6579, 10.7721, null)).toBeNull();
  });

  it('formats distance nicely in Vietnamese with caveat', () => {
    expect(formatDistanceVi(null)).toBe('Vị trí chưa rõ');
    expect(formatDistanceVi(1.4)).toContain('~1,4 km (đường chim bay)');
  });
});
