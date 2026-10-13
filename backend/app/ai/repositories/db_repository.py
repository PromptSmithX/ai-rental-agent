from typing import List, Optional
from sqlalchemy.orm import Session
from app.services.campus_service import CampusService
from app.services.room_service import RoomService
from app.schemas.campus import CampusResponse
from app.schemas.room import RoomView, RoomDetailResponse
from app.schemas.search import SearchFilters, SearchResult
from app.ai.repositories.base import BaseAgentRoomRepository


class DatabaseAgentRoomRepository(BaseAgentRoomRepository):
    """Adapts existing SQLAlchemy RoomService & CampusService to BaseAgentRoomRepository."""

    def __init__(self, db: Session):
        self.db = db
        self.campus_service = CampusService(db)
        self.room_service = RoomService(db)

    def list_campuses(self) -> List[CampusResponse]:
        return self.campus_service.list_campuses()

    def get_campus_by_id(self, campus_id: str) -> Optional[CampusResponse]:
        return self.campus_service.get_campus_by_id(campus_id)

    def search_rooms(self, filters: SearchFilters) -> SearchResult:
        return self.room_service.search_rooms(filters)

    def get_room_by_id(self, room_id: str) -> Optional[RoomView]:
        return self.room_service.get_room_by_id(room_id)

    def get_room_detail_by_id(self, room_id: str) -> Optional[RoomDetailResponse]:
        return self.room_service.get_room_detail_by_id(room_id)

    def list_all_rooms(self) -> List[RoomView]:
        return self.room_service.list_all_rooms()
