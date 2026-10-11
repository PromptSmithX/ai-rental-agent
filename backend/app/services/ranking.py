from typing import List, Optional, Tuple
from app.domain.models import Room, Campus
from app.schemas.search import SearchFilters, RoomSearchHit
from app.services.distance import calculate_air_distance_km


def evaluate_room_hit(
    room: Room,
    campus: Optional[Campus],
    filters: SearchFilters,
) -> Tuple[Optional[float], Optional[float], List[str], List[str]]:
    """Evaluate distance, ranking score, match reasons, and caveats for a room.
    
    Returns:
        (distance_km, ranking_score, match_reasons, caveats)
    """
    # 1. Calculate distance if campus is selected
    distance_km: Optional[float] = None
    if campus is not None and room.latitude is not None and room.longitude is not None:
        distance_km = calculate_air_distance_km(
            campus.latitude,
            campus.longitude,
            room.latitude,
            room.longitude,
        )

    # 2. Match reasons
    match_reasons: List[str] = []
    if filters.max_price_vnd is not None:
        tr_val = filters.max_price_vnd / 1_000_000
        # Format as int or float without trailing zero
        tr_str = f"{int(tr_val)}" if tr_val.is_integer() else f"{tr_val:.1f}"
        match_reasons.append(f"Phù hợp ngân sách (≤ {tr_str}tr)")
    else:
        match_reasons.append("Giá thuê phù hợp")

    if distance_km is not None:
        match_reasons.append(f"Cách cơ sở ~{distance_km} km")

    req_amenities = filters.required_amenities or []
    if len(req_amenities) > 0:
        match_reasons.append(f"Đủ {len(req_amenities)} tiện ích yêu cầu")

    if filters.pet_allowed is True and room.pet_allowed is True:
        match_reasons.append("Cho phép nuôi thú cưng")

    # 3. Caveats
    caveats: List[str] = []
    if room.location_accuracy == "approximate":
        caveats.append("Vị trí ước lượng (đường chim bay)")
    elif room.location_accuracy == "unknown" or room.latitude is None or room.longitude is None:
        caveats.append("Chưa có tọa độ chính xác")

    if room.utilities_monthly_estimate_vnd is None:
        caveats.append("Chưa rõ chi phí điện nước phát sinh")

    if room.area_m2 is None:
        caveats.append("Chưa rõ diện tích thực tế")

    # 4. Scoring formula
    # 0.40 distance score + 0.35 budget headroom + 0.25 amenity overlap
    max_budget = filters.max_price_vnd if filters.max_price_vnd is not None else 5_000_000
    budget_headroom = max(0.0, min(1.0, (max_budget - room.price_monthly_vnd) / max_budget))
    distance_score = (
        max(0.0, min(1.0, 1.0 - distance_km / 5.0))
        if distance_km is not None
        else 0.5
    )
    amenities_count = len(room.amenities) if room.amenities else 0
    amenity_overlap = amenities_count / 6.0

    ranking_score = round(
        0.4 * distance_score + 0.35 * budget_headroom + 0.25 * amenity_overlap, 2
    )

    return distance_km, ranking_score, match_reasons, caveats
