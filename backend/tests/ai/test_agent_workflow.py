import pytest
from app.domain.enums import Amenity, SortByOption
from app.schemas.search import SearchFilters
from app.ai.dependencies import get_agent_repository, set_agent_repository
from app.ai.repositories.mock_hanoi_repo import MockHanoiRepository
from app.ai.services.agent_service import AgentService
from app.ai.graph.builder import build_agent_graph
from langgraph.checkpoint.memory import MemorySaver


@pytest.fixture(autouse=True)
def setup_agent_repo():
    repo = MockHanoiRepository(mode="mock_hybrid")
    set_agent_repository(repo)
    return repo


@pytest.fixture
def agent_service():
    cp = MemorySaver()
    graph = build_agent_graph(checkpointer=cp)
    return AgentService(graph=graph)


def test_hanoi_initial_search(agent_service):
    thread_id = "test-thread-hanoi-01"
    msg = "Tìm phòng dưới 3 triệu quanh Bách Khoa Hà Nội trong 2 km"

    res = agent_service.run_turn(thread_id=thread_id, message=msg)

    assert res.status == "completed"
    assert res.result is not None
    assert res.result.total_matched > 0

    applied = res.result.applied_filters
    assert applied.campus_id == "hust-hanoi"
    assert applied.max_price_vnd == 3000000
    assert applied.max_distance_km == 2.0

    # Event sequence check
    event_types = [e.type.value for e in res.events]
    assert "run_started" in event_types
    assert "preferences_extracted" in event_types
    assert "campus_resolved" in event_types
    assert "rooms_searched" in event_types
    assert "rooms_ranked" in event_types
    assert "response_ready" in event_types
    assert "run_completed" in event_types


def test_hcm_s01_search(agent_service):
    thread_id = "test-thread-hcm-01"
    msg = "Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km"

    res = agent_service.run_turn(thread_id=thread_id, message=msg)

    assert res.status == "completed"
    assert res.result is not None
    assert res.result.applied_filters.campus_id == "hcmut-ltk"
    hit_ids = [h.room_id for h in res.result.hits]
    assert "demo-room-01" in hit_ids


def test_multi_turn_refinement_conversation(agent_service):
    thread_id = "test-thread-multiturn"

    # Turn 1: Search
    res1 = agent_service.run_turn(
        thread_id=thread_id,
        message="Tìm phòng dưới 3 triệu quanh Bách Khoa Hà Nội trong 2 km",
    )
    assert res1.result.applied_filters.campus_id == "hust-hanoi"
    assert res1.result.applied_filters.max_price_vnd == 3000000

    # Turn 2: S02 - "Có máy lạnh nữa"
    res2 = agent_service.run_turn(
        thread_id=thread_id,
        message="Có máy lạnh nữa",
        current_filters=res1.result.applied_filters,
    )
    f2 = res2.result.applied_filters
    assert f2.campus_id == "hust-hanoi"
    assert f2.max_price_vnd == 3000000
    assert Amenity.AIR_CONDITIONER in f2.required_amenities

    # Turn 3: S03 - "Cho nuôi mèo"
    res3 = agent_service.run_turn(
        thread_id=thread_id,
        message="Cho nuôi mèo",
        current_filters=f2,
    )
    f3 = res3.result.applied_filters
    assert f3.campus_id == "hust-hanoi"
    assert f3.pet_allowed is True
    assert Amenity.AIR_CONDITIONER in f3.required_amenities

    # Turn 4: S04 - "Tăng ngân sách lên 3,5 triệu"
    res4 = agent_service.run_turn(
        thread_id=thread_id,
        message="Tăng ngân sách lên 3,5 triệu",
        current_filters=f3,
    )
    f4 = res4.result.applied_filters
    assert f4.max_price_vnd == 3500000
    assert f4.pet_allowed is True
    assert Amenity.AIR_CONDITIONER in f4.required_amenities

    # Turn 5: S05 - "Bỏ máy lạnh đi"
    res5 = agent_service.run_turn(
        thread_id=thread_id,
        message="Bỏ máy lạnh đi",
        current_filters=f4,
    )
    f5 = res5.result.applied_filters
    assert Amenity.AIR_CONDITIONER not in f5.required_amenities
    assert f5.max_price_vnd == 3500000
    assert f5.pet_allowed is True


def test_s06_clarification_on_ambiguous_campus(agent_service):
    thread_id = "test-thread-clarify"
    msg = "Tìm phòng gần trường mình"

    res = agent_service.run_turn(thread_id=thread_id, message=msg)

    assert res.status == "needs_clarification"
    assert res.clarification_question is not None
    assert "trường" in res.clarification_question.lower()
    event_types = [e.type.value for e in res.events]
    assert "clarification_required" in event_types


def test_s07_zero_results_and_relaxations(agent_service):
    thread_id = "test-thread-zero-hits"
    msg = "Dưới 1 triệu, có điều hòa, nuôi mèo, dưới 500m"

    res = agent_service.run_turn(thread_id=thread_id, message=msg)

    assert res.result is not None
    assert res.result.total_matched == 0
    assert "Gợi ý" in res.message.content or "nới lỏng" in res.message.content or "tiêu chí" in res.message.content


def test_s08_room_detail(agent_service):
    thread_id = "test-thread-detail"
    msg = "Cho mình xem phòng demo-room-01"

    res = agent_service.run_turn(thread_id=thread_id, message=msg)

    assert res.status == "completed"
    assert "demo-room-01" in res.message.referenced_room_ids
    assert "demo-room-01" in res.message.content


def test_s09_compare_rooms(agent_service):
    thread_id = "test-thread-compare"
    msg = "So sánh phòng 01 và 02"

    res = agent_service.run_turn(thread_id=thread_id, message=msg)

    assert res.status == "completed"
    assert len(res.message.referenced_room_ids) >= 2
    assert "so sánh" in res.message.content.lower()


def test_s10_sort_by_distance(agent_service):
    thread_id = "test-thread-sort"
    init_filters = SearchFilters(campus_id="hust-hanoi", max_price_vnd=3000000)

    res = agent_service.run_turn(
        thread_id=thread_id,
        message="Phòng nào gần nhất?",
        current_filters=init_filters,
    )

    assert res.result is not None
    assert res.result.applied_filters.sort_by == SortByOption.DISTANCE_ASC


def test_s11_availability_disclosure(agent_service):
    thread_id = "test-thread-s11"
    msg = "Có phòng nào hết hạn không?"

    res = agent_service.run_turn(thread_id=thread_id, message=msg)

    assert res.status == "completed"
    assert "mô phỏng" in res.message.content.lower() or "demo" in res.message.content.lower()
