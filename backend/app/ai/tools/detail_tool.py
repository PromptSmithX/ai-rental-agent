from typing import Optional
from app.schemas.room import RoomView, RoomDetailResponse
from app.ai.repositories.base import BaseAgentRoomRepository


def get_room_details(room_id: str, repo: BaseAgentRoomRepository) -> Optional[RoomView]:
    """Retrieve existing room record by ID.
    
    Invariants:
    - Never generates or fabricates missing fields.
    - Returns None if room not found.
    """
    if not room_id:
        return None
    return repo.get_room_by_id(room_id)


def get_room_detail_full(room_id: str, repo: BaseAgentRoomRepository) -> Optional[RoomDetailResponse]:
    """Retrieve full room detail with images and metadata by ID."""
    if not room_id:
        return None
    return repo.get_room_detail_by_id(room_id)
