import pytest
from sqlalchemy.orm import Session
from app.domain.enums import Amenity, SortByOption
from app.repositories.room_repository import RoomRepository
from app.services.room_service import RoomService
from app.schemas.search import SearchFilters


def test_filter_max_price(db_session: Session):
    service = RoomService(db_session)
    filters = SearchFilters(max_price_vnd=2500000)
    result = service.search_rooms(filters)

    assert result.total_matched > 0
    repo = RoomRepository(db_session)
    for hit in result.hits:
        room = repo.get_by_id(hit.room_id)
        assert room is not None
        assert room.price_monthly_vnd <= 2500000


def test_filter_required_amenities(db_session: Session):
    service = RoomService(db_session)
    filters = SearchFilters(required_amenities=[Amenity.AIR_CONDITIONER, Amenity.KITCHEN])
    result = service.search_rooms(filters)

    assert result.total_matched > 0
    repo = RoomRepository(db_session)
    for hit in result.hits:
        room = repo.get_by_id(hit.room_id)
        assert room is not None
        assert "air_conditioner" in room.amenities
        assert "kitchen" in room.amenities


def test_filter_pet_allowed_strictly(db_session: Session):
    service = RoomService(db_session)
    filters = SearchFilters(pet_allowed=True)
    result = service.search_rooms(filters)

    assert result.total_matched > 0
    repo = RoomRepository(db_session)
    for hit in result.hits:
        room = repo.get_by_id(hit.room_id)
        assert room is not None
        assert room.pet_allowed is True


def test_filter_max_distance_excludes_missing_coords(db_session: Session):
    service = RoomService(db_session)
    filters = SearchFilters(campus_id="hcmut-ltk", max_distance_km=2.0)
    result = service.search_rooms(filters)

    assert result.total_matched > 0
    repo = RoomRepository(db_session)
    for hit in result.hits:
        room = repo.get_by_id(hit.room_id)
        assert room is not None
        assert room.latitude is not None
        assert room.longitude is not None
        assert hit.distance_km is not None
        assert hit.distance_km <= 2.0


def test_filter_min_area_excludes_missing_area(db_session: Session):
    service = RoomService(db_session)
    filters = SearchFilters(min_area_m2=25.0)
    result = service.search_rooms(filters)

    assert result.total_matched > 0
    repo = RoomRepository(db_session)
    for hit in result.hits:
        room = repo.get_by_id(hit.room_id)
        assert room is not None
        assert room.area_m2 is not None
        assert room.area_m2 >= 25.0


def test_sort_by_price_asc(db_session: Session):
    service = RoomService(db_session)
    filters = SearchFilters(sort_by=SortByOption.PRICE_ASC)
    result = service.search_rooms(filters)

    assert result.total_matched > 1
    repo = RoomRepository(db_session)
    for i in range(1, len(result.hits)):
        prev_room = repo.get_by_id(result.hits[i - 1].room_id)
        curr_room = repo.get_by_id(result.hits[i].room_id)
        assert prev_room.price_monthly_vnd <= curr_room.price_monthly_vnd


def test_sort_by_distance_asc(db_session: Session):
    service = RoomService(db_session)
    filters = SearchFilters(campus_id="hcmut-ltk", sort_by=SortByOption.DISTANCE_ASC)
    result = service.search_rooms(filters)

    assert result.total_matched > 1
    for i in range(1, len(result.hits)):
        prev_dist = result.hits[i - 1].distance_km if result.hits[i - 1].distance_km is not None else 999.0
        curr_dist = result.hits[i].distance_km if result.hits[i].distance_km is not None else 999.0
        assert prev_dist <= curr_dist


def test_scenario_s01_filters(db_session: Session):
    # S01: <= 3M, quanh HCMUT LTK, <= 2km
    service = RoomService(db_session)
    filters = SearchFilters(
        campus_id="hcmut-ltk",
        max_price_vnd=3000000,
        max_distance_km=2.0,
    )
    result = service.search_rooms(filters)
    assert result.total_matched > 0
    hit_ids = [h.room_id for h in result.hits]
    assert "demo-room-01" in hit_ids
    assert "demo-room-07" not in hit_ids  # Over budget and outside radius


def test_scenario_s07_zero_results(db_session: Session):
    # S07: < 1 triệu, có điều hòa, nuôi mèo, < 500m -> Zero results
    service = RoomService(db_session)
    filters = SearchFilters(
        campus_id="hcmut-ltk",
        max_price_vnd=1000000,
        required_amenities=[Amenity.AIR_CONDITIONER],
        pet_allowed=True,
        max_distance_km=0.5,
    )
    result = service.search_rooms(filters)
    assert result.total_matched == 0
    assert len(result.hits) == 0
