import pytest
from sqlalchemy.orm import Session
from app.domain.enums import Amenity, SortByOption
from app.schemas.search import SearchFilters
from app.ai.repositories.mock_hanoi_repo import MockHanoiRepository
from app.ai.repositories.db_repository import DatabaseAgentRoomRepository
from app.ai.dependencies import get_agent_repository, set_agent_repository
from app.ai.tools.campus_tool import resolve_campus
from app.ai.tools.search_tool import search_rooms
from app.ai.tools.detail_tool import get_room_details, get_room_detail_full
from app.ai.tools.compare_tool import compare_rooms
from app.ai.tools.relaxation_tool import suggest_filter_relaxations


@pytest.fixture
def mock_repo():
    return MockHanoiRepository(mode="mock_hybrid")


@pytest.fixture
def db_repo(db_session: Session):
    return DatabaseAgentRoomRepository(db_session)


# ==========================================
# 1. CAMPUS RESOLUTION TOOL TESTS
# ==========================================

def test_campus_tool_exact_id_matches(mock_repo):
    for cid in ["hust-hanoi", "vnu-hanoi", "neu-hanoi", "hcmut-ltk", "hcmut-da"]:
        res = resolve_campus(cid, mock_repo)
        assert res.campus_id == cid
        assert not res.is_ambiguous
        assert res.latitude is not None
        assert res.longitude is not None


def test_campus_tool_hanoi_acronyms_and_aliases(mock_repo):
    # HUST
    for q in ["hust", "bkhn", "đhbkhn", "Bách Khoa Hà Nội", "quanh hust", "gần bkhn"]:
        res = resolve_campus(q, mock_repo)
        assert res.campus_id == "hust-hanoi"
        assert not res.is_ambiguous

    # VNU
    for q in ["vnu", "qghn", "đhqghn", "đại học quốc gia hà nội", "xuân thủy"]:
        res = resolve_campus(q, mock_repo)
        assert res.campus_id == "vnu-hanoi"
        assert not res.is_ambiguous

    # NEU
    for q in ["neu", "ktqd", "đhktqd", "kinh tế quốc dân", "giải phóng"]:
        res = resolve_campus(q, mock_repo)
        assert res.campus_id == "neu-hanoi"
        assert not res.is_ambiguous


def test_campus_tool_hcm_acronyms_and_aliases(mock_repo):
    # HCMUT - LTK
    for q in ["ltk", "lý thường kiệt", "bách khoa quận 10", "bách khoa q10", "bách khoa tphcm", "hcmut-ltk"]:
        res = resolve_campus(q, mock_repo)
        assert res.campus_id == "hcmut-ltk"
        assert not res.is_ambiguous

    # HCMUT - Dĩ An
    for q in ["dĩ an", "bách khoa dĩ an", "khu b", "làng đại học", "hcmut-da"]:
        res = resolve_campus(q, mock_repo)
        assert res.campus_id == "hcmut-da"
        assert not res.is_ambiguous


def test_campus_tool_ambiguous_and_unknown_queries(mock_repo):
    # Bare "bách khoa" matches multiple campuses in hybrid mode
    res = resolve_campus("bách khoa", mock_repo)
    assert res.is_ambiguous is True
    assert len(res.candidates) >= 2

    # Empty / whitespace query
    res_empty = resolve_campus("", mock_repo)
    assert res_empty.is_ambiguous is True
    assert len(res_empty.candidates) > 0

    res_none = resolve_campus(None, mock_repo)
    assert res_none.is_ambiguous is True
    assert len(res_none.candidates) > 0

    # Completely unknown school
    res_unknown = resolve_campus("đại học nông nghiệp cần thơ", mock_repo)
    assert res_unknown.is_ambiguous is True
    assert len(res_unknown.candidates) > 0


# ==========================================
# 2. SEARCH TOOL TESTS (MOCK & DB REPO)
# ==========================================

def test_search_tool_hard_filters_mock_repo(mock_repo):
    # 1. Max price
    filters = SearchFilters(campus_id="hust-hanoi", max_price_vnd=2800000)
    res = search_rooms(filters, mock_repo)
    assert res.total_matched > 0
    all_rooms = {r.id: r for r in mock_repo.list_all_rooms()}
    for h in res.hits:
        assert all_rooms[h.room_id].price_monthly_vnd <= 2800000

    # 2. Min area
    filters_area = SearchFilters(campus_id="hust-hanoi", min_area_m2=25.0)
    res_area = search_rooms(filters_area, mock_repo)
    assert res_area.total_matched > 0
    for h in res_area.hits:
        room = all_rooms[h.room_id]
        assert room.area_m2 is not None and room.area_m2 >= 25.0

    # 3. Pet allowed
    filters_pet = SearchFilters(campus_id="hust-hanoi", pet_allowed=True)
    res_pet = search_rooms(filters_pet, mock_repo)
    assert res_pet.total_matched > 0
    for h in res_pet.hits:
        assert all_rooms[h.room_id].pet_allowed is True

    # 4. Required amenities
    filters_amenity = SearchFilters(
        campus_id="hust-hanoi",
        required_amenities=[Amenity.AIR_CONDITIONER, Amenity.WIFI],
    )
    res_amenity = search_rooms(filters_amenity, mock_repo)
    assert res_amenity.total_matched > 0
    for h in res_amenity.hits:
        room = all_rooms[h.room_id]
        amenities = room.amenities or []
        assert Amenity.AIR_CONDITIONER in amenities
        assert Amenity.WIFI in amenities


def test_search_tool_sorting_options(mock_repo):
    filters_price = SearchFilters(
        campus_id="hust-hanoi",
        sort_by=SortByOption.PRICE_ASC,
    )
    res_price = search_rooms(filters_price, mock_repo)
    all_rooms = {r.id: r for r in mock_repo.list_all_rooms()}
    prices = [all_rooms[h.room_id].price_monthly_vnd for h in res_price.hits]
    assert prices == sorted(prices)

    filters_dist = SearchFilters(
        campus_id="hust-hanoi",
        sort_by=SortByOption.DISTANCE_ASC,
    )
    res_dist = search_rooms(filters_dist, mock_repo)
    distances = [h.distance_km for h in res_dist.hits if h.distance_km is not None]
    assert distances == sorted(distances)


def test_search_tool_db_repository(db_repo):
    # S01: Quanh Bách Khoa LTK, <= 3 triệu, <= 2km
    filters = SearchFilters(
        campus_id="hcmut-ltk",
        max_price_vnd=3000000,
        max_distance_km=2.0,
    )
    res = search_rooms(filters, db_repo)
    assert res.total_matched > 0
    hit_ids = [h.room_id for h in res.hits]
    assert "demo-room-01" in hit_ids

    # Zero results on impossible constraints
    impossible_filters = SearchFilters(
        campus_id="hcmut-ltk",
        max_price_vnd=500000,
        max_distance_km=0.2,
    )
    res_zero = search_rooms(impossible_filters, db_repo)
    assert res_zero.total_matched == 0
    assert len(res_zero.hits) == 0


# ==========================================
# 3. ROOM DETAIL TOOL TESTS
# ==========================================

def test_detail_tool_existing_and_missing_rooms(mock_repo):
    # Existing room
    room = get_room_details("hanoi-room-01", mock_repo)
    assert room is not None
    assert room.id == "hanoi-room-01"
    assert room.price_monthly_vnd == 2800000
    assert room.latitude is not None
    assert room.longitude is not None

    # Full detail with images
    full_detail = get_room_detail_full("hanoi-room-01", mock_repo)
    assert full_detail is not None
    assert full_detail.id == "hanoi-room-01"
    assert len(full_detail.images) > 0

    # Non-existent room
    assert get_room_details("non-existent-999", mock_repo) is None
    assert get_room_detail_full("non-existent-999", mock_repo) is None

    # Empty room ID
    assert get_room_details("", mock_repo) is None
    assert get_room_detail_full("", mock_repo) is None


def test_detail_tool_db_repo(db_repo):
    room = get_room_details("demo-room-01", db_repo)
    assert room is not None
    assert room.id == "demo-room-01"
    assert room.price_monthly_vnd == 2800000

    full_detail = get_room_detail_full("demo-room-01", db_repo)
    assert full_detail is not None
    assert len(full_detail.images) >= 2


# ==========================================
# 4. ROOM COMPARISON TOOL TESTS
# ==========================================

def test_compare_tool_two_rooms(mock_repo):
    comp = compare_rooms(["hanoi-room-01", "hanoi-room-02"], mock_repo, campus_id="hust-hanoi")
    assert len(comp.rooms) == 2
    assert len(comp.missing_room_ids) == 0
    assert "hanoi-room-01" in comp.comparison_table
    assert "hanoi-room-02" in comp.comparison_table

    # Check table structure
    t1 = comp.comparison_table["hanoi-room-01"]
    assert "priceMonthlyVnd" in t1
    assert "areaM2" in t1
    assert "distanceKm" in t1
    assert isinstance(t1["distanceKm"], float)
    assert "amenities" in t1
    assert "petAllowed" in t1
    assert "utilitiesMonthlyEstimateVnd" in t1

    assert "hanoi-room-01" in comp.summary
    assert "hanoi-room-02" in comp.summary


def test_compare_tool_three_rooms_and_truncation(mock_repo):
    # Pass 4 IDs -> must truncate to 3
    ids = ["hanoi-room-01", "hanoi-room-02", "hanoi-room-03", "hanoi-room-04"]
    comp = compare_rooms(ids, mock_repo, campus_id="hust-hanoi")
    assert len(comp.rooms) == 3
    assert "hanoi-room-04" not in comp.comparison_table
    assert "3 phòng" in comp.summary


def test_compare_tool_missing_ids_and_unknown_fields(mock_repo):
    # 1 found, 1 missing
    comp = compare_rooms(["hanoi-room-01", "room-ghost-404"], mock_repo)
    assert len(comp.rooms) == 1
    assert "room-ghost-404" in comp.missing_room_ids
    assert "room-ghost-404" in comp.summary

    # All missing
    comp_all_missing = compare_rooms(["ghost-1", "ghost-2"], mock_repo)
    assert len(comp_all_missing.rooms) == 0
    assert len(comp_all_missing.missing_room_ids) == 2
    assert "Không tìm thấy" in comp_all_missing.summary

    # Empty list
    comp_empty = compare_rooms([], mock_repo)
    assert len(comp_empty.rooms) == 0
    assert "Không tìm thấy" in comp_empty.summary


def test_compare_tool_without_campus(mock_repo):
    comp = compare_rooms(["hanoi-room-01", "hanoi-room-02"], mock_repo, campus_id=None)
    assert len(comp.rooms) == 2
    # When campus_id is None, distanceKm must be "Chưa rõ" (not fabricated)
    assert comp.comparison_table["hanoi-room-01"]["distanceKm"] == "Chưa rõ"


# ==========================================
# 5. RELAXATION TOOL TESTS (VERIFIED COUNTS)
# ==========================================

def test_relaxation_tool_verified_counts_mock(mock_repo):
    # Initial tight filter with 0 hits: budget 1.8M near hust-hanoi within 0.3km
    tight_filters = SearchFilters(
        campus_id="hust-hanoi",
        max_price_vnd=1800000,
        max_distance_km=0.3,
        required_amenities=[Amenity.AIR_CONDITIONER, Amenity.WIFI],
    )
    zero_res = search_rooms(tight_filters, mock_repo)
    assert zero_res.total_matched == 0

    suggestions = suggest_filter_relaxations(tight_filters, mock_repo)
    assert len(suggestions) > 0

    for s in suggestions:
        # Every suggested relaxation must guarantee matched_count > 0
        assert s.matched_count > 0
        # Verification: querying the proposed filters against the repo must match matched_count exactly
        verification_res = search_rooms(s.proposed_filters, mock_repo)
        assert verification_res.total_matched == s.matched_count
        assert verification_res.total_matched > 0

    # Invariant: tight_filters must NOT have been mutated
    assert tight_filters.max_price_vnd == 1800000
    assert tight_filters.max_distance_km == 0.3
    assert len(tight_filters.required_amenities) == 2


def test_relaxation_tool_verified_counts_db(db_repo):
    # Tight filter in DB with 0 hits: price <= 1.5M, distance <= 0.8km near hcmut-ltk
    tight_filters = SearchFilters(
        campus_id="hcmut-ltk",
        max_price_vnd=1500000,
        max_distance_km=0.8,
    )
    zero_res = search_rooms(tight_filters, db_repo)
    assert zero_res.total_matched == 0

    suggestions = suggest_filter_relaxations(tight_filters, db_repo)
    assert len(suggestions) > 0

    for s in suggestions:
        assert s.matched_count > 0
        # Test against real database session
        verification_res = search_rooms(s.proposed_filters, db_repo)
        assert verification_res.total_matched == s.matched_count


# ==========================================
# 6. REPOSITORY MODE DEPENDENCIES
# ==========================================

def test_repository_dependencies_mode():
    # Mock Hanoi mode
    repo_hanoi = get_agent_repository(mode="mock_hanoi")
    assert repo_hanoi.mode == "mock_hanoi"

    # Mock Hybrid mode
    repo_hybrid = get_agent_repository(mode="mock_hybrid")
    assert repo_hybrid.mode == "mock_hybrid"

    # Override repository
    custom_repo = MockHanoiRepository(mode="mock_hanoi")
    set_agent_repository(custom_repo)
    assert get_agent_repository() is custom_repo
