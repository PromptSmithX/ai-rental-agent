from app.schemas.base import CamelModel
from app.schemas.campus import CampusBase, CampusCreate, CampusUpdate, CampusResponse
from app.schemas.room import (
    RoomBase,
    RoomCreate,
    RoomUpdate,
    RoomView,
    RoomDetailResponse,
    RoomListResponse,
    RoomImageBase,
    RoomImageCreate,
    RoomImageResponse,
)
from app.schemas.search import (
    SearchFilters,
    RoomSearchHit,
    SearchResult,
)

__all__ = [
    "CamelModel",
    "CampusBase",
    "CampusCreate",
    "CampusUpdate",
    "CampusResponse",
    "RoomBase",
    "RoomCreate",
    "RoomUpdate",
    "RoomView",
    "RoomDetailResponse",
    "RoomListResponse",
    "RoomImageBase",
    "RoomImageCreate",
    "RoomImageResponse",
    "SearchFilters",
    "RoomSearchHit",
    "SearchResult",
]
