/**
 * Calculate aerial distance between two coordinates using the Haversine formula.
 * Earth radius is approximated at 6371 km.
 * Returns straight-line km rounded to 1 decimal place, or null if coordinates are missing.
 */
export function calculateAirDistanceKm(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  // Basic boundary checks
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) return null;
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) return null;

  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function formatDistanceVi(distanceKm: number | null): string {
  if (distanceKm === null) {
    return 'Vị trí chưa rõ';
  }
  return `~${distanceKm.toLocaleString('vi-VN')} km (đường chim bay)`;
}
