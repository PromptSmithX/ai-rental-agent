from datetime import datetime, timezone
from typing import List, Optional
from app.domain.enums import SortByOption
from app.schemas.campus import CampusResponse
from app.schemas.room import RoomView, RoomDetailResponse, RoomImageResponse
from app.schemas.search import SearchFilters, RoomSearchHit, SearchResult
from app.services.distance import calculate_air_distance_km
from app.services.ranking import evaluate_room_hit
from app.ai.repositories.base import BaseAgentRoomRepository
from app.ai.repositories.hanoi_fixtures import (
    HANOI_CAMPUSES,
    HCM_CAMPUSES,
    HANOI_ROOMS,
    HCM_ROOMS,
)


class MockHanoiRepository(BaseAgentRoomRepository):
    """Deterministic in-memory repository for Hanoi and hybrid university rental discovery."""

    def __init__(self, mode: str = "mock_hybrid"):
        self.mode = mode
        if mode == "mock_hanoi":
            self.campuses = list(HANOI_CAMPUSES)
            self.rooms = list(HANOI_ROOMS)
        else:  # 'mock_hybrid' (default)
            self.campuses = list(HANOI_CAMPUSES) + list(HCM_CAMPUSES)
            self.rooms = list(HANOI_ROOMS) + list(HCM_ROOMS)

    def list_campuses(self) -> List[CampusResponse]:
        return list(self.campuses)

    def get_campus_by_id(self, campus_id: str) -> Optional[CampusResponse]:
        for c in self.campuses:
            if c.id == campus_id:
                return c
        return None

    def list_all_rooms(self) -> List[RoomView]:
        return list(self.rooms)

    def get_room_by_id(self, room_id: str) -> Optional[RoomView]:
        for r in self.rooms:
            if r.id == room_id:
                return r
        return None

    def get_room_detail_by_id(self, room_id: str) -> Optional[RoomDetailResponse]:
        room = self.get_room_by_id(room_id)
        if not room:
            return None
        images = [
            RoomImageResponse(
                id=idx + 1,
                room_id=room.id,
                image_url=url,
                caption=f"Ảnh {idx + 1}",
                display_order=idx,
                created_at=datetime.now(timezone.utc),
            )
            for idx, url in enumerate(room.image_urls)
        ]
        return RoomDetailResponse(
            **room.model_dump(),
            images=images,
        )

    def search_rooms(self, filters: SearchFilters) -> SearchResult:
        """Apply strict hard filters, compute straight-line distance, score and rank."""
        campus = self.get_campus_by_id(filters.campus_id) if filters.campus_id else None
        matched: List[RoomView] = []

        for room in self.rooms:
            # 1. HARD FILTER: Max price
            if filters.max_price_vnd is not None and room.price_monthly_vnd > filters.max_price_vnd:
                continue

            # 2. HARD FILTER: Min Area
            if filters.min_area_m2 is not None:
                if room.area_m2 is None or room.area_m2 < filters.min_area_m2:
                    continue

            # 3. HARD FILTER: Pet allowed
            if filters.pet_allowed is not None:
                if room.pet_allowed != filters.pet_allowed:
                    continue

            # 4. HARD FILTER: Required Amenities
            if filters.required_amenities and len(filters.required_amenities) > 0:
                room_amenity_vals = [
                    a.value if hasattr(a, "value") else str(a) for a in (room.amenities or [])
                ]
                has_all = all(
                    (req.value if hasattr(req, "value") else str(req)) in room_amenity_vals
                    for req in filters.required_amenities
                )
                if not has_all:
                    continue

            # 5. HARD FILTER: Max Distance
            if filters.max_distance_km is not None:
                if campus is None or room.latitude is None or room.longitude is None:
                    # Missing coordinates cannot satisfy strict distance filter
                    continue
                dist = calculate_air_distance_km(
                    campus.latitude,
                    campus.longitude,
                    room.latitude,
                    room.longitude,
                )
                if dist is None or dist > filters.max_distance_km:
                    continue

            matched.append(room)

        # Build search hits with scores, reasons, and caveats
        hits: List[RoomSearchHit] = []
        for room in matched:
            dist_km = None
            if campus and room.latitude is not None and room.longitude is not None:
                dist_km = calculate_air_distance_km(
                    campus.latitude,
                    campus.longitude,
                    room.latitude,
                    room.longitude,
                )

            # Match reasons
            reasons = []
            if filters.max_price_vnd is not None:
                tr_val = filters.max_price_vnd / 1_000_000
                tr_str = f"{int(tr_val)}" if tr_val.is_integer() else f"{tr_val:.1f}"
                reasons.append(f"Phù hợp ngân sách (≤ {tr_str}tr)")
            else:
                reasons.append("Giá thuê phù hợp")

            if dist_km is not None:
                reasons.append(f"Cách cơ sở ~{dist_km} km")

            if filters.required_amenities:
                reasons.append(f"Đủ {len(filters.required_amenities)} tiện ích yêu cầu")

            if filters.pet_allowed is True and room.pet_allowed is True:
                reasons.append("Cho phép nuôi thú cưng")

            # Caveats
            caveats = []
            if room.location_accuracy.value == "approximate":
                caveats.append("Vị trí ước lượng (đường chim bay)")
            elif room.location_accuracy.value == "unknown" or room.latitude is None:
                caveats.append("Chưa có tọa độ chính xác")

            if room.utilities_monthly_estimate_vnd is None:
                caveats.append("Chưa rõ chi phí điện nước phát sinh")

            if room.area_m2 is None:
                caveats.append("Chưa rõ diện tích thực tế")

            # Scoring
            max_budget = filters.max_price_vnd if filters.max_price_vnd is not None else 5_000_000
            budget_headroom = max(0.0, min(1.0, (max_budget - room.price_monthly_vnd) / max_budget))
            distance_score = max(0.0, min(1.0, 1.0 - (dist_km / 5.0))) if dist_km is not None else 0.5
            amenities_count = len(room.amenities) if room.amenities else 0
            amenity_overlap = amenities_count / 6.0

            ranking_score = round(
                0.4 * distance_score + 0.35 * budget_headroom + 0.25 * amenity_overlap, 2
            )

            hits.append(
                RoomSearchHit(
                    room_id=room.id,
                    title=room.title,
                    price_monthly_vnd=room.price_monthly_vnd,
                    address_label=room.address_label,
                    distance_km=dist_km,
                    ranking_score=ranking_score,
                    match_reasons=reasons,
                    caveats=caveats,
                )
            )

        # Sorting
        if filters.sort_by == SortByOption.PRICE_ASC:
            room_map = {r.id: r for r in matched}
            hits.sort(key=lambda h: room_map[h.room_id].price_monthly_vnd)
        elif filters.sort_by == SortByOption.DISTANCE_ASC:
            hits.sort(
                key=lambda h: (
                    1 if h.distance_km is None else 0,
                    h.distance_km if h.distance_km is not None else float("inf"),
                )
            )
        else:
            # Default 'recommended'
            hits.sort(key=lambda h: (h.ranking_score or 0.0), reverse=True)

        return SearchResult(
            applied_filters=filters,
            hits=hits,
            total_matched=len(hits),
            searched_at=datetime.now(timezone.utc),
            dataset_mode="demo",
        )
