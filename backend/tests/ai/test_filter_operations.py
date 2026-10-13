import pytest
from app.domain.enums import Amenity, SortByOption
from app.schemas.search import SearchFilters
from app.ai.schemas.filters import FilterOpType, FilterOperation
from app.ai.state.filter_ops import merge_filter_operations


def test_unmentioned_filters_remain_unchanged():
    initial = SearchFilters(
        campus_id="hust-hanoi",
        max_price_vnd=3000000,
        max_distance_km=2.0,
        required_amenities=[Amenity.AIR_CONDITIONER],
        pet_allowed=True,
    )

    # User only changes price
    ops = [FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value=3500000)]
    updated = merge_filter_operations(initial, ops)

    assert updated.max_price_vnd == 3500000
    assert updated.campus_id == "hust-hanoi"
    assert updated.max_distance_km == 2.0
    assert updated.required_amenities == [Amenity.AIR_CONDITIONER]
    assert updated.pet_allowed is True


def test_set_scalar_fields():
    initial = SearchFilters()

    ops = [
        FilterOperation(op=FilterOpType.SET, field="campus_id", value="vnu-hanoi"),
        FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value=2500000),
        FilterOperation(op=FilterOpType.SET, field="max_distance_km", value=1.5),
        FilterOperation(op=FilterOpType.SET, field="min_area_m2", value=20.0),
        FilterOperation(op=FilterOpType.SET, field="sort_by", value="distance_asc"),
    ]
    updated = merge_filter_operations(initial, ops)

    assert updated.campus_id == "vnu-hanoi"
    assert updated.max_price_vnd == 2500000
    assert updated.max_distance_km == 1.5
    assert updated.min_area_m2 == 20.0
    assert updated.sort_by == SortByOption.DISTANCE_ASC


def test_add_amenities_no_duplicates():
    initial = SearchFilters(required_amenities=[Amenity.AIR_CONDITIONER])

    # Adding air_conditioner again should not duplicate
    ops = [
        FilterOperation(op=FilterOpType.ADD, field="required_amenities", value="air_conditioner"),
        FilterOperation(op=FilterOpType.ADD, field="required_amenities", value="wifi"),
    ]
    updated = merge_filter_operations(initial, ops)

    assert len(updated.required_amenities) == 2
    assert Amenity.AIR_CONDITIONER in updated.required_amenities
    assert Amenity.WIFI in updated.required_amenities


def test_remove_amenity():
    initial = SearchFilters(
        required_amenities=[Amenity.AIR_CONDITIONER, Amenity.WIFI, Amenity.PARKING]
    )

    ops = [
        FilterOperation(op=FilterOpType.REMOVE, field="required_amenities", value="air_conditioner")
    ]
    updated = merge_filter_operations(initial, ops)

    assert Amenity.AIR_CONDITIONER not in updated.required_amenities
    assert Amenity.WIFI in updated.required_amenities
    assert Amenity.PARKING in updated.required_amenities


def test_clear_field():
    initial = SearchFilters(
        max_distance_km=2.0,
        required_amenities=[Amenity.WIFI],
    )

    ops = [
        FilterOperation(op=FilterOpType.CLEAR, field="max_distance_km"),
        FilterOperation(op=FilterOpType.CLEAR, field="required_amenities"),
    ]
    updated = merge_filter_operations(initial, ops)

    assert updated.max_distance_km is None
    assert updated.required_amenities == []


def test_reset_all():
    initial = SearchFilters(
        campus_id="hust-hanoi",
        max_price_vnd=3000000,
        max_distance_km=2.0,
        required_amenities=[Amenity.AIR_CONDITIONER],
        pet_allowed=True,
        sort_by=SortByOption.DISTANCE_ASC,
    )

    ops = [FilterOperation(op=FilterOpType.RESET_ALL, field="all")]
    updated = merge_filter_operations(initial, ops)

    assert updated.campus_id is None
    assert updated.max_price_vnd is None
    assert updated.max_distance_km is None
    assert updated.required_amenities == []
    assert updated.pet_allowed is None
    assert updated.sort_by == SortByOption.RECOMMENDED


def test_pet_allowed_tri_state():
    initial = SearchFilters()

    # None initially
    assert initial.pet_allowed is None

    # Set to True
    res_true = merge_filter_operations(
        initial, [FilterOperation(op=FilterOpType.SET, field="pet_allowed", value=True)]
    )
    assert res_true.pet_allowed is True

    # Set to False
    res_false = merge_filter_operations(
        res_true, [FilterOperation(op=FilterOpType.SET, field="pet_allowed", value=False)]
    )
    assert res_false.pet_allowed is False

    # Clear back to None
    res_clear = merge_filter_operations(
        res_false, [FilterOperation(op=FilterOpType.CLEAR, field="pet_allowed")]
    )
    assert res_clear.pet_allowed is None


def test_invalid_operations_do_not_corrupt_state():
    initial = SearchFilters(max_price_vnd=3000000)

    # Unknown field, non-numeric price
    ops = [
        FilterOperation(op=FilterOpType.SET, field="non_existent_field", value="bogus"),
        FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value="invalid_number"),
    ]
    updated = merge_filter_operations(initial, ops)

    # Original valid price preserved
    assert updated.max_price_vnd == 3000000


def test_contradictory_operations_evaluation_order():
    initial = SearchFilters(max_price_vnd=2000000)

    # First set 3tr, then set 3.5tr
    ops = [
        FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value=3000000),
        FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value=3500000),
    ]
    updated = merge_filter_operations(initial, ops)

    assert updated.max_price_vnd == 3500000
