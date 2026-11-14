from typing import Any, List, Union
from app.domain.enums import Amenity, SortByOption
from app.schemas.search import SearchFilters
from app.ai.schemas.filters import FilterOpType, FilterOperation

FIELD_ALIAS_MAP = {
    "campusId": "campus_id",
    "campus_id": "campus_id",
    "maxPriceVnd": "max_price_vnd",
    "max_price_vnd": "max_price_vnd",
    "maxPrice": "max_price_vnd",
    "max_price": "max_price_vnd",
    "maxDistanceKm": "max_distance_km",
    "max_distance_km": "max_distance_km",
    "maxDistance": "max_distance_km",
    "max_distance": "max_distance_km",
    "minAreaM2": "min_area_m2",
    "min_area_m2": "min_area_m2",
    "minArea": "min_area_m2",
    "min_area": "min_area_m2",
    "requiredAmenities": "required_amenities",
    "required_amenities": "required_amenities",
    "amenities": "required_amenities",
    "petAllowed": "pet_allowed",
    "pet_allowed": "pet_allowed",
    "sortBy": "sort_by",
    "sort_by": "sort_by",
}

VALID_FIELDS = {
    "campus_id",
    "max_price_vnd",
    "max_distance_km",
    "min_area_m2",
    "required_amenities",
    "pet_allowed",
    "sort_by",
}


def _normalize_amenity(val: Any) -> Union[Amenity, None]:
    if isinstance(val, Amenity):
        return val
    if isinstance(val, str):
        v = val.lower().strip()
        for a in Amenity:
            if a.value == v or a.name.lower() == v:
                return a
    return None


def _normalize_sort_by(val: Any) -> SortByOption:
    if isinstance(val, SortByOption):
        return val
    if isinstance(val, str):
        v = val.lower().strip()
        for s in SortByOption:
            if s.value == v or s.name.lower() == v:
                return s
    return SortByOption.RECOMMENDED


def merge_filter_operations(
    current: Union[SearchFilters, dict],
    operations: List[Union[FilterOperation, dict]],
) -> SearchFilters:
    """Pure, deterministic merger of filter operations.
    
    Invariants:
    1. Unmentioned fields remain unmodified.
    2. Invalid operations or unknown fields do not corrupt existing state.
    3. 'set' overwrites the specific field.
    4. 'add' appends to required_amenities without duplicates.
    5. 'remove' removes a specific item from required_amenities or clears a scalar.
    6. 'clear' restores field to its default empty/null state.
    7. 'reset_all' resets the entire filter set to initial defaults.
    8. Distinguishes None (any), True, and False for pet_allowed.
    """
    # Initialize from current state
    if isinstance(current, SearchFilters):
        state = {
            "campus_id": current.campus_id,
            "max_price_vnd": current.max_price_vnd,
            "max_distance_km": current.max_distance_km,
            "min_area_m2": current.min_area_m2,
            "required_amenities": list(current.required_amenities or []),
            "pet_allowed": current.pet_allowed,
            "sort_by": current.sort_by or SortByOption.RECOMMENDED,
        }
    else:
        state = {
            "campus_id": current.get("campus_id") or current.get("campusId"),
            "max_price_vnd": current.get("max_price_vnd") or current.get("maxPriceVnd"),
            "max_distance_km": current.get("max_distance_km") or current.get("maxDistanceKm"),
            "min_area_m2": current.get("min_area_m2") or current.get("minAreaM2"),
            "required_amenities": list(current.get("required_amenities") or current.get("requiredAmenities") or []),
            "pet_allowed": current.get("pet_allowed") if "pet_allowed" in current else current.get("petAllowed"),
            "sort_by": current.get("sort_by") or current.get("sortBy") or SortByOption.RECOMMENDED,
        }

    # Normalize amenities in initial state
    norm_amenities: List[Amenity] = []
    for item in state["required_amenities"]:
        norm_a = _normalize_amenity(item)
        if norm_a and norm_a not in norm_amenities:
            norm_amenities.append(norm_a)
    state["required_amenities"] = norm_amenities
    state["sort_by"] = _normalize_sort_by(state["sort_by"])

    for raw_op in operations:
        if isinstance(raw_op, dict):
            op = FilterOperation(**raw_op)
        elif isinstance(raw_op, FilterOperation):
            op = raw_op
        else:
            continue

        if op.op == FilterOpType.RESET_ALL:
            state["campus_id"] = None
            state["max_price_vnd"] = None
            state["max_distance_km"] = None
            state["min_area_m2"] = None
            state["required_amenities"] = []
            state["pet_allowed"] = None
            state["sort_by"] = SortByOption.RECOMMENDED
            continue

        canonical_field = FIELD_ALIAS_MAP.get(op.field)
        if not canonical_field or canonical_field not in VALID_FIELDS:
            # Ignore unknown or invalid fields safely
            continue

        if op.op == FilterOpType.CLEAR:
            if canonical_field == "required_amenities":
                state["required_amenities"] = []
            elif canonical_field == "sort_by":
                state["sort_by"] = SortByOption.RECOMMENDED
            else:
                state[canonical_field] = None

        elif op.op == FilterOpType.SET:
            if canonical_field == "required_amenities":
                if isinstance(op.value, list):
                    new_list: List[Amenity] = []
                    for item in op.value:
                        norm_a = _normalize_amenity(item)
                        if norm_a and norm_a not in new_list:
                            new_list.append(norm_a)
                    state["required_amenities"] = new_list
                elif op.value is None:
                    state["required_amenities"] = []
            elif canonical_field == "max_price_vnd":
                try:
                    state["max_price_vnd"] = int(op.value) if op.value is not None else None
                except (ValueError, TypeError):
                    pass
            elif canonical_field == "max_distance_km":
                try:
                    state["max_distance_km"] = float(op.value) if op.value is not None else None
                except (ValueError, TypeError):
                    pass
            elif canonical_field == "min_area_m2":
                try:
                    state["min_area_m2"] = float(op.value) if op.value is not None else None
                except (ValueError, TypeError):
                    pass
            elif canonical_field == "pet_allowed":
                if op.value is None or op.value == "null":
                    state["pet_allowed"] = None
                elif isinstance(op.value, bool):
                    state["pet_allowed"] = op.value
                elif isinstance(op.value, str):
                    if op.value.lower() in ("true", "1", "yes", "co", "có"):
                        state["pet_allowed"] = True
                    elif op.value.lower() in ("false", "0", "no", "khong", "không"):
                        state["pet_allowed"] = False
                    else:
                        state["pet_allowed"] = None
            elif canonical_field == "sort_by":
                state["sort_by"] = _normalize_sort_by(op.value)
            elif canonical_field == "campus_id":
                state["campus_id"] = str(op.value) if op.value else None

        elif op.op == FilterOpType.ADD:
            if canonical_field == "required_amenities":
                items_to_add = op.value if isinstance(op.value, list) else [op.value]
                for item in items_to_add:
                    norm_a = _normalize_amenity(item)
                    if norm_a and norm_a not in state["required_amenities"]:
                        state["required_amenities"].append(norm_a)
            else:
                # Add on scalar field behaves like set
                state[canonical_field] = op.value

        elif op.op == FilterOpType.REMOVE:
            if canonical_field == "required_amenities":
                items_to_remove = op.value if isinstance(op.value, list) else [op.value]
                to_remove_enums = {_normalize_amenity(x) for x in items_to_remove if _normalize_amenity(x)}
                state["required_amenities"] = [
                    a for a in state["required_amenities"] if a not in to_remove_enums
                ]
            else:
                # Removing a scalar constraint sets it to None
                state[canonical_field] = None

    return SearchFilters(
        campus_id=state["campus_id"],
        max_price_vnd=state["max_price_vnd"],
        max_distance_km=state["max_distance_km"],
        min_area_m2=state["min_area_m2"],
        required_amenities=state["required_amenities"],
        pet_allowed=state["pet_allowed"],
        sort_by=state["sort_by"],
    )
