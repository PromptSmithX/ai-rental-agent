from typing import Optional
from app.schemas.room import RoomView
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
