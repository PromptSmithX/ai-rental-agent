from typing import Any, Dict, List, Optional
from pydantic import Field
from app.schemas.base import CamelModel
from app.schemas.room import RoomView
from app.services.distance import calculate_air_distance_km
from app.ai.repositories.base import BaseAgentRoomRepository


class RoomComparisonResult(CamelModel):
    rooms: List[RoomView] = Field(default_factory=list)
    missing_room_ids: List[str] = Field(default_factory=list)
    comparison_table: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    summary: str = ""


def compare_rooms(
    room_ids: List[str],
    repo: BaseAgentRoomRepository,
    campus_id: Optional[str] = None,
) -> RoomComparisonResult:
    """Compare 2 to 3 rooms side by side without fabricating missing fields."""
    found_rooms: List[RoomView] = []
    missing_ids: List[str] = []

    campus = repo.get_campus_by_id(campus_id) if campus_id else None

    for rid in room_ids[:3]:  # max 3 rooms
        room = repo.get_room_by_id(rid)
        if room:
            found_rooms.append(room)
        else:
            missing_ids.append(rid)

    table: Dict[str, Dict[str, Any]] = {}
    for r in found_rooms:
        dist_km = None
        if campus and r.latitude is not None and r.longitude is not None:
            dist_km = calculate_air_distance_km(
                campus.latitude, campus.longitude, r.latitude, r.longitude
            )

        table[r.id] = {
            "title": r.title,
            "priceMonthlyVnd": r.price_monthly_vnd,
            "areaM2": r.area_m2 if r.area_m2 is not None else "Chưa rõ",
            "distanceKm": dist_km if dist_km is not None else "Chưa rõ",
            "amenities": [a.value if hasattr(a, "value") else str(a) for a in r.amenities],
            "petAllowed": (
                "Cho phép" if r.pet_allowed is True
                else ("Không cho phép" if r.pet_allowed is False else "Chưa rõ")
            ),
            "utilitiesMonthlyEstimateVnd": (
                r.utilities_monthly_estimate_vnd
                if r.utilities_monthly_estimate_vnd is not None
                else "Chưa rõ"
            ),
        }

    # Deterministic summary
    if len(found_rooms) >= 3:
        r1, r2, r3 = found_rooms[0], found_rooms[1], found_rooms[2]
        p1 = f"{r1.price_monthly_vnd / 1_000_000:.1f}tr"
        p2 = f"{r2.price_monthly_vnd / 1_000_000:.1f}tr"
        p3 = f"{r3.price_monthly_vnd / 1_000_000:.1f}tr"
        summary = (
            f"Bảng so sánh giữa 3 phòng: {r1.id} ({p1}), {r2.id} ({p2}) và {r3.id} ({p3})."
        )
    elif len(found_rooms) == 2:
        r1, r2 = found_rooms[0], found_rooms[1]
        p1 = f"{r1.price_monthly_vnd / 1_000_000:.1f}tr"
        p2 = f"{r2.price_monthly_vnd / 1_000_000:.1f}tr"
        summary = (
            f"Bảng so sánh giữa {r1.id} ({p1}, {r1.area_m2 or 'chưa rõ'}m²) "
            f"và {r2.id} ({p2}, {r2.area_m2 or 'chưa rõ'}m²)."
        )
    elif len(found_rooms) == 1:
        summary = f"Chỉ tìm thấy thông tin cho 1 phòng: {found_rooms[0].id}."
    else:
        summary = "Không tìm thấy thông tin của các phòng được yêu cầu so sánh."

    if missing_ids:
        summary += f" Lưu ý: Không tìm thấy phòng {', '.join(missing_ids)}."

    return RoomComparisonResult(
        rooms=found_rooms,
        missing_room_ids=missing_ids,
        comparison_table=table,
        summary=summary,
    )
