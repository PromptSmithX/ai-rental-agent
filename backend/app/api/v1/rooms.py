from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_room_service
from app.domain.enums import Amenity, SortByOption
from app.schemas.room import RoomView, RoomDetailResponse
from app.schemas.search import SearchFilters, SearchResult
from app.services.room_service import RoomService

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("", response_model=List[RoomView], summary="List or query room listings")
def list_rooms(
    campus_id: Optional[str] = Query(None, description="Campus ID to calculate distance from"),
    max_price_vnd: Optional[int] = Query(None, description="Maximum monthly rent in VND"),
    max_distance_km: Optional[float] = Query(None, description="Maximum straight-line distance in km"),
    min_area_m2: Optional[float] = Query(None, description="Minimum room area in square meters"),
    amenities: Optional[List[Amenity]] = Query(None, description="List of required amenities"),
    pet_allowed: Optional[bool] = Query(None, description="Pet policy requirement"),
    sort_by: SortByOption = Query(SortByOption.RECOMMENDED, description="Sort order"),
    service: RoomService = Depends(get_room_service),
) -> List[RoomView]:
    """Retrieve room listings, optionally filtered by search criteria."""
    # If any search filter is provided, perform filtered search and return room views
    has_filter = any(
        x is not None
        for x in [
            campus_id,
            max_price_vnd,
            max_distance_km,
            min_area_m2,
            pet_allowed,
        ]
    ) or (amenities is not None and len(amenities) > 0) or sort_by != SortByOption.RECOMMENDED

    if not has_filter:
        return service.list_all_rooms()

    filters = SearchFilters(
        campus_id=campus_id,
        max_price_vnd=max_price_vnd,
        max_distance_km=max_distance_km,
        min_area_m2=min_area_m2,
        required_amenities=amenities or [],
        pet_allowed=pet_allowed,
        sort_by=sort_by,
    )
    result = service.search_rooms(filters)
    # Order matched room views by search hit order
    hit_ids = [hit.room_id for hit in result.hits]
    all_matched = {r.id: r for r in service.list_all_rooms() if r.id in hit_ids}
    return [all_matched[rid] for rid in hit_ids if rid in all_matched]


@router.post("/search", response_model=SearchResult, summary="Execute structured search")
def search_rooms(
    filters: SearchFilters,
    service: RoomService = Depends(get_room_service),
) -> SearchResult:
    """Execute a structured search with hard filters, distance, ranking score, and caveats."""
    return service.search_rooms(filters)


@router.get("/{room_id}", response_model=RoomDetailResponse, summary="Get room detail by ID")
def get_room_detail(
    room_id: str,
    service: RoomService = Depends(get_room_service),
) -> RoomDetailResponse:
    """Retrieve detailed information for a single room listing, including images."""
    room = service.get_room_detail_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id '{room_id}' not found",
        )
    return room
