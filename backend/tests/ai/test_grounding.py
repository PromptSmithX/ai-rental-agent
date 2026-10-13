import pytest
from app.domain.enums import Amenity, LocationAccuracy, ListingStatus
from app.schemas.search import SearchFilters, SearchResult, RoomSearchHit
from app.schemas.room import RoomView
from app.ai.schemas.intent import UserIntent
from app.ai.llm.mock_llm import MockResponseGenerator
from app.ai.tools.compare_tool import compare_rooms
from app.ai.tools.relaxation_tool import RelaxationSuggestion
from app.ai.repositories.mock_hanoi_repo import MockHanoiRepository


@pytest.fixture
def repo():
    return MockHanoiRepository(mode="mock_hybrid")


def test_grounded_response_cites_only_verified_hits():
    filters = SearchFilters(campus_id="hust-hanoi", max_price_vnd=3000000)
    hits = [
        RoomSearchHit(room_id="hanoi-room-01", distance_km=0.3, ranking_score=0.9, match_reasons=["Hợp ví"], caveats=[]),
        RoomSearchHit(room_id="hanoi-room-03", distance_km=0.3, ranking_score=0.8, match_reasons=["Gần"], caveats=[]),
    ]
    search_res = SearchResult(
        applied_filters=filters,
        hits=hits,
        total_matched=2,
        searched_at="2026-10-13T00:00:00Z",
    )

    answer = MockResponseGenerator.generate(
        user_message="Tìm phòng gần Bách Khoa Hà Nội",
        intent=UserIntent.SEARCH,
        filters=filters,
        search_result=search_res,
    )

    # Must mention verified hits
    assert "hanoi-room-01" in answer
    assert "hanoi-room-03" in answer
    # Must NOT mention unverified/unseen IDs
    assert "hanoi-room-99" not in answer
    assert "demo-room-99" not in answer


def test_grounded_zero_result_response_does_not_invent_rooms():
    filters = SearchFilters(campus_id="hust-hanoi", max_price_vnd=500000)
    search_res = SearchResult(
        applied_filters=filters,
        hits=[],
        total_matched=0,
        searched_at="2026-10-13T00:00:00Z",
    )
    relaxations = [
        RelaxationSuggestion(
            action_type="increase_budget",
            description="Tăng ngân sách lên 2.5tr (3 phòng phù hợp)",
            proposed_filters=filters,
            matched_count=3,
        )
    ]

    answer = MockResponseGenerator.generate(
        user_message="Tìm phòng 500k",
        intent=UserIntent.SEARCH,
        filters=filters,
        search_result=search_res,
        relaxation_options=relaxations,
    )

    # Conveys zero result and relaxation honestly
    assert "Chưa có phòng" in answer or "không tìm thấy" in answer
    assert "Tăng ngân sách" in answer
    # Does not pretend rooms exist
    assert "Tìm thấy 5 phòng" not in answer


def test_grounded_room_detail_respects_missing_attributes():
    room = RoomView(
        id="hanoi-room-09",
        title="Phòng trọ ngõ Trương Định",
        price_monthly_vnd=2600000,
        area_m2=None,  # Missing area
        image_urls=[],  # Missing images
        address_label="Ngõ 104 Trương Định",
        latitude=20.9910,
        longitude=105.8470,
        location_accuracy=LocationAccuracy.APPROXIMATE,
        amenities=[Amenity.WIFI],
        pet_allowed=None,
        listing_status=ListingStatus.UNKNOWN,
    )

    answer = MockResponseGenerator.generate(
        user_message="Cho mình xem phòng hanoi-room-09",
        intent=UserIntent.ROOM_DETAIL,
        filters=SearchFilters(),
        detail_result=room,
    )

    assert "hanoi-room-09" in answer
    assert "2.6tr" in answer
    assert "Ngõ 104 Trương Định" in answer
    # Mentions unknown area honestly
    assert "chưa rõ" in answer.lower()


def test_grounded_comparison_matrix(repo):
    comp_res = compare_rooms(["hanoi-room-01", "hanoi-room-02"], repo, campus_id="hust-hanoi")

    answer = MockResponseGenerator.generate(
        user_message="So sánh phòng 01 và 02",
        intent=UserIntent.COMPARE,
        filters=SearchFilters(campus_id="hust-hanoi"),
        comparison_result=comp_res,
    )

    assert "hanoi-room-01" in answer
    assert "hanoi-room-02" in answer
    assert "so sánh" in answer.lower()
