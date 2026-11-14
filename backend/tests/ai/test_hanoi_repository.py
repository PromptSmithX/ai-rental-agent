import pytest
from app.domain.enums import Amenity, SortByOption
from app.schemas.search import SearchFilters
from app.ai.repositories.mock_hanoi_repo import MockHanoiRepository
from app.ai.tools.relaxation_tool import suggest_filter_relaxations


@pytest.fixture
def hanoi_repo():
    return MockHanoiRepository(mode="mock_hanoi")


def test_hanoi_campuses_loaded(hanoi_repo):
    campuses = hanoi_repo.list_campuses()
    campus_ids = [c.id for c in campuses]
    assert "hust-hanoi" in campus_ids
    assert "vnu-hanoi" in campus_ids
    assert "neu-hanoi" in campus_ids


def test_hard_filter_max_price(hanoi_repo):
    filters = SearchFilters(max_price_vnd=2500000)
    result = hanoi_repo.search_rooms(filters)

    assert result.total_matched > 0
    for hit in result.hits:
        room = hanoi_repo.get_room_by_id(hit.room_id)
        assert room is not None
        assert room.price_monthly_vnd <= 2500000


def test_hard_filter_min_area(hanoi_repo):
    filters = SearchFilters(min_area_m2=25.0)
    result = hanoi_repo.search_rooms(filters)

    assert result.total_matched > 0
    for hit in result.hits:
        room = hanoi_repo.get_room_by_id(hit.room_id)
        assert room is not None
        assert room.area_m2 is not None
        assert room.area_m2 >= 25.0


def test_hard_filter_pet_policy(hanoi_repo):
    # Only pet allowed
    filters_pets = SearchFilters(pet_allowed=True)
    result_pets = hanoi_repo.search_rooms(filters_pets)

    assert result_pets.total_matched > 0
    for hit in result_pets.hits:
        room = hanoi_repo.get_room_by_id(hit.room_id)
        assert room.pet_allowed is True

    # No pets allowed
    filters_no_pets = SearchFilters(pet_allowed=False)
    result_no_pets = hanoi_repo.search_rooms(filters_no_pets)

    assert result_no_pets.total_matched > 0
    for hit in result_no_pets.hits:
        room = hanoi_repo.get_room_by_id(hit.room_id)
        assert room.pet_allowed is False


def test_hard_filter_amenities(hanoi_repo):
    filters = SearchFilters(
        required_amenities=[Amenity.AIR_CONDITIONER, Amenity.KITCHEN]
    )
    result = hanoi_repo.search_rooms(filters)

    assert result.total_matched > 0
    for hit in result.hits:
        room = hanoi_repo.get_room_by_id(hit.room_id)
        assert Amenity.AIR_CONDITIONER in room.amenities
        assert Amenity.KITCHEN in room.amenities


def test_hard_filter_distance_and_missing_coordinates(hanoi_repo):
    # Search around HUST within 1.0 km
    filters = SearchFilters(
        campus_id="hust-hanoi",
        max_distance_km=1.0,
    )
    result = hanoi_repo.search_rooms(filters)

    assert result.total_matched > 0
    hit_ids = [h.room_id for h in result.hits]

    # hanoi-room-08 has no coordinates -> MUST be excluded from strict distance search
    assert "hanoi-room-08" not in hit_ids

    # hanoi-room-10 is in Long Bien (> 5 km) -> MUST be excluded
    assert "hanoi-room-10" not in hit_ids

    for hit in result.hits:
        assert hit.distance_km is not None
        assert hit.distance_km <= 1.0


def test_sorting_options(hanoi_repo):
    filters_price = SearchFilters(
        campus_id="hust-hanoi",
        sort_by=SortByOption.PRICE_ASC,
    )
    res_price = hanoi_repo.search_rooms(filters_price)
    prices = [hanoi_repo.get_room_by_id(h.room_id).price_monthly_vnd for h in res_price.hits]
    assert prices == sorted(prices)

    filters_dist = SearchFilters(
        campus_id="hust-hanoi",
        sort_by=SortByOption.DISTANCE_ASC,
    )
    res_dist = hanoi_repo.search_rooms(filters_dist)
    valid_distances = [h.distance_km for h in res_dist.hits if h.distance_km is not None]
    assert valid_distances == sorted(valid_distances)


def test_suggest_relaxations_real_counts(hanoi_repo):
    # Impossible criteria: <= 1.0 million near HUST within 500m
    filters = SearchFilters(
        campus_id="hust-hanoi",
        max_price_vnd=1000000,
        max_distance_km=0.5,
    )
    zero_res = hanoi_repo.search_rooms(filters)
    assert zero_res.total_matched == 0

    suggestions = suggest_filter_relaxations(filters, hanoi_repo)
    # Check that relaxations have REAL matched_count > 0 from actual queries
    assert len(suggestions) > 0
    for s in suggestions:
        assert s.matched_count > 0
        real_check = hanoi_repo.search_rooms(s.proposed_filters)
        assert real_check.total_matched == s.matched_count
