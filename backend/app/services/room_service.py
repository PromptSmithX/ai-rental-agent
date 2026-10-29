from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from app.domain.models import Room, Campus
from app.domain.enums import SortByOption
from app.repositories.room_repository import RoomRepository
from app.repositories.campus_repository import CampusRepository
from app.schemas.room import RoomView, RoomDetailResponse
from app.schemas.search import SearchFilters, RoomSearchHit, SearchResult
from app.services.ranking import evaluate_room_hit
from app.config import settings


class RoomService:
    """Core Room business service.
    
    Can be called directly by REST API controllers or directly by future
    LangGraph agent workflow tools without HTTP overhead.
    """

    def __init__(self, db: Session):
        self.db = db
        self.room_repo = RoomRepository(db)
        self.campus_repo = CampusRepository(db)

    def get_room_by_id(self, room_id: str) -> Optional[RoomView]:
        room = self.room_repo.get_by_id(room_id)
        if not room:
            return None
        return RoomView.model_validate(room)

    def get_room_detail_by_id(self, room_id: str) -> Optional[RoomDetailResponse]:
        room = self.room_repo.get_by_id(room_id)
        if not room:
            return None
        return RoomDetailResponse.model_validate(room)

    def list_all_rooms(self) -> List[RoomView]:
        rooms = self.room_repo.list_all()
        return [RoomView.model_validate(r) for r in rooms]

    def search_rooms(self, filters: SearchFilters) -> SearchResult:
        """Execute structured search with filtering, distance, scoring, and sorting."""
        # 1. Resolve campus if campus_id provided
        campus: Optional[Campus] = None
        if filters.campus_id:
            campus = self.campus_repo.get_by_id(filters.campus_id)

        # 2. Filter matching room entities
        matched_rooms = self.room_repo.search_rooms(filters=filters, campus=campus)

        # 3. Score and evaluate each hit
        hits: List[RoomSearchHit] = []
        room_map = {r.id: r for r in matched_rooms}

        for room in matched_rooms:
            distance_km, ranking_score, match_reasons, caveats = evaluate_room_hit(
                room=room,
                campus=campus,
                filters=filters,
            )
            hits.append(
                RoomSearchHit(
                    room_id=room.id,
                    title=room.title,
                    price_monthly_vnd=room.price_monthly_vnd,
                    address_label=room.address_label,
                    distance_km=distance_km,
                    ranking_score=ranking_score,
                    match_reasons=match_reasons,
                    caveats=caveats,
                )
            )

        # 4. Sort results
        if filters.sort_by == SortByOption.PRICE_ASC:
            hits.sort(key=lambda h: room_map[h.room_id].price_monthly_vnd)
        elif filters.sort_by == SortByOption.DISTANCE_ASC:
            # None distances sort to the end
            hits.sort(
                key=lambda h: (
                    1 if h.distance_km is None else 0,
                    h.distance_km if h.distance_km is not None else float("inf"),
                )
            )
        else:
            # Default: 'recommended' by ranking score descending
            hits.sort(key=lambda h: (h.ranking_score or 0.0), reverse=True)

        return SearchResult(
            applied_filters=filters,
            hits=hits,
            total_matched=len(hits),
            searched_at=datetime.now(timezone.utc),
            dataset_mode=settings.DATASET_MODE,
        )
