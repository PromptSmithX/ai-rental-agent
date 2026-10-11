import math
from typing import Optional


def calculate_air_distance_km(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float],
) -> Optional[float]:
    """Calculate aerial distance between two coordinates using the Haversine formula.
    
    Earth radius is approximated at 6371 km.
    Returns straight-line km rounded to 1 decimal place, or None if coordinates are missing/invalid.
    Mirrors frontend calculateAirDistanceKm exactly.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None

    # Basic boundary checks
    if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90):
        return None
    if not (-180 <= lon1 <= 180 and -180 <= lon2 <= 180):
        return None

    r = 6371.0  # Earth's mean radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lon / 2.0) ** 2
    )

    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = r * c

    return round(distance, 1)


def format_distance_vi(distance_km: Optional[float]) -> str:
    """Format distance in Vietnamese prose."""
    if distance_km is None:
        return "Vị trí chưa rõ"
    return f"~{distance_km:.1f} km (đường chim bay)"
