from abc import ABC, abstractmethod
from typing import List, Optional
from app.schemas.campus import CampusResponse
from app.schemas.room import RoomView, RoomDetailResponse
from app.schemas.search import SearchFilters, SearchResult


class BaseAgentRoomRepository(ABC):
    """Abstract interface decoupling AI Agent nodes and tools from data backend."""

    @abstractmethod
    def list_campuses(self) -> List[CampusResponse]:
        """List all supported university campuses."""
        pass

    @abstractmethod
    def get_campus_by_id(self, campus_id: str) -> Optional[CampusResponse]:
        """Retrieve campus record by ID."""
        pass

    @abstractmethod
    def search_rooms(self, filters: SearchFilters) -> SearchResult:
        """Search rooms with hard-filter enforcement, distance, and ranking."""
        pass

    @abstractmethod
    def get_room_by_id(self, room_id: str) -> Optional[RoomView]:
        """Get canonical room view by ID."""
        pass

    @abstractmethod
    def get_room_detail_by_id(self, room_id: str) -> Optional[RoomDetailResponse]:
        """Get detailed room record including image metadata."""
        pass

    @abstractmethod
    def list_all_rooms(self) -> List[RoomView]:
        """List all rooms in the repository."""
        pass
