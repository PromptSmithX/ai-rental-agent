import json
import pytest
from fastapi.testclient import TestClient
from app.ai.dependencies import get_agent_repository, set_agent_repository
from app.ai.repositories.mock_hanoi_repo import MockHanoiRepository
from app.ai.llm.factory import set_extractor, set_response_generator
from app.ai.llm.mock_llm import MockExtractor, MockResponseGenerator
from app.ai.services.agent_service import AgentService
from app.ai.graph.builder import build_agent_graph
from langgraph.checkpoint.memory import MemorySaver


@pytest.fixture(autouse=True)
def setup_mock_repo():
    repo = MockHanoiRepository(mode="mock_hybrid")
    set_agent_repository(repo)
    return repo


@pytest.fixture(autouse=True)
def setup_mock_llm():
    # Pin to mock LLM so these tests stay deterministic/offline regardless
    # of the runtime AGENT_LLM_MODE configured in .env.
    set_extractor(MockExtractor())
    set_response_generator(MockResponseGenerator())
    try:
        yield
    finally:
        set_extractor(None)
        set_response_generator(None)


@pytest.fixture
def custom_agent_service():
    cp = MemorySaver()
    graph = build_agent_graph(checkpointer=cp)
    return AgentService(graph=graph)


def test_multi_turn_state_persistence_and_refinement(custom_agent_service):
    thread_id = "test-multi-turn-thread-42"

    # Turn 1: Search under 3M near Bách Khoa Hà Nội
    turn1_res = custom_agent_service.run_turn(
        thread_id=thread_id,
        message="Tìm phòng dưới 3 triệu quanh Bách Khoa Hà Nội trong 2 km",
    )
    assert turn1_res.status == "completed"
    assert turn1_res.result is not None
    assert turn1_res.result.applied_filters.campus_id == "hust-hanoi"
    assert turn1_res.result.applied_filters.max_price_vnd == 3000000

    # Verify conversation state saved in checkpointer
    conv1 = custom_agent_service.get_conversation(thread_id)
    assert conv1["threadId"] == thread_id
    assert conv1["canonicalFilters"]["campus_id"] == "hust-hanoi"
    assert conv1["canonicalFilters"]["max_price_vnd"] == 3000000
    assert len(conv1["messages"]) == 2  # 1 user + 1 assistant

    # Turn 2: Refine: Add air conditioner
    turn2_res = custom_agent_service.run_turn(
        thread_id=thread_id,
        message="Thêm điều hòa nữa nhé",
    )
    assert turn2_res.status == "completed"
    assert turn2_res.result is not None
    # Previous constraints MUST be preserved from checkpoint!
    assert turn2_res.result.applied_filters.campus_id == "hust-hanoi"
    assert turn2_res.result.applied_filters.max_price_vnd == 3000000
    req_amenities = [
        a.value if hasattr(a, "value") else str(a)
        for a in turn2_res.result.applied_filters.required_amenities
    ]
    assert "air_conditioner" in req_amenities

    # Verify conversation state after Turn 2
    conv2 = custom_agent_service.get_conversation(thread_id)
    assert len(conv2["messages"]) == 4  # 2 user + 2 assistant


def test_thread_isolation(custom_agent_service):
    thread_a = "thread-alpha"
    thread_b = "thread-beta"

    # Thread A searches near HUST
    custom_agent_service.run_turn(
        thread_id=thread_a,
        message="Tìm phòng quanh Bách Khoa Hà Nội dưới 2.5 triệu",
    )

    # Thread B searches near HCMUT LTK
    custom_agent_service.run_turn(
        thread_id=thread_b,
        message="Tìm phòng quanh Lý Thường Kiệt dưới 3 triệu",
    )

    conv_a = custom_agent_service.get_conversation(thread_a)
    conv_b = custom_agent_service.get_conversation(thread_b)

    assert conv_a["canonicalFilters"]["campus_id"] == "hust-hanoi"
    assert conv_a["canonicalFilters"]["max_price_vnd"] == 2500000

    assert conv_b["canonicalFilters"]["campus_id"] == "hcmut-ltk"
    assert conv_b["canonicalFilters"]["max_price_vnd"] == 3000000


def test_clear_conversation(custom_agent_service):
    thread_id = "thread-to-clear"
    custom_agent_service.run_turn(
        thread_id=thread_id,
        message="Tìm phòng gần Bách Khoa",
    )

    conv_before = custom_agent_service.get_conversation(thread_id)
    assert len(conv_before["messages"]) >= 2

    # Clear
    custom_agent_service.clear_conversation(thread_id)
    conv_after = custom_agent_service.get_conversation(thread_id)
    assert conv_after["messages"] == []
    assert conv_after["canonicalFilters"] == {}


# ==========================================
# FASTAPI ENDPOINTS TESTS
# ==========================================

def test_api_agent_chat_endpoint_success(client: TestClient):
    payload = {
        "threadId": "api-test-thread-01",
        "message": "Tìm phòng quanh Bách Khoa Hà Nội dưới 3 triệu",
    }
    response = client.post("/api/v1/agent/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["threadId"] == "api-test-thread-01"
    assert data["status"] in ("completed", "extracting", "searching")
    assert "message" in data
    assert data["message"]["role"] == "assistant"
    assert len(data["message"]["content"]) > 0
    assert "events" in data
    assert len(data["events"]) > 0
    assert data["isSimulation"] is True


def test_api_agent_chat_stream_endpoint(client: TestClient):
    payload = {
        "threadId": "api-stream-thread-01",
        "message": "Tìm phòng quanh Bách Khoa Hà Nội dưới 3 triệu",
    }
    response = client.post("/api/v1/agent/chat/stream", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    # Parse SSE text
    sse_text = response.text
    assert "event: agent_event" in sse_text
    assert "event: agent_reply" in sse_text

    # Verify event blocks
    blocks = sse_text.strip().split("\n\n")
    event_types = []
    reply_found = False

    for block in blocks:
        lines = block.split("\n")
        if len(lines) >= 2 and lines[0].startswith("event:"):
            evt_name = lines[0].replace("event: ", "").strip()
            data_str = lines[1].replace("data: ", "").strip()
            data_obj = json.loads(data_str)
            if evt_name == "agent_event":
                event_types.append(data_obj.get("type"))
            elif evt_name == "agent_reply":
                reply_found = True
                assert data_obj["threadId"] == "api-stream-thread-01"
                assert "message" in data_obj

    assert "run_started" in event_types
    assert reply_found is True


def test_api_agent_conversations_get_and_delete(client: TestClient):
    thread_id = "api-conv-thread-99"
    # Execute a turn first
    client.post(
        "/api/v1/agent/chat",
        json={"threadId": thread_id, "message": "Tìm phòng dưới 3tr"},
    )

    # GET conversation
    get_res = client.get(f"/api/v1/agent/conversations/{thread_id}")
    assert get_res.status_code == 200
    conv_data = get_res.json()
    assert conv_data["threadId"] == thread_id
    assert len(conv_data["messages"]) >= 2

    # DELETE conversation
    del_res = client.delete(f"/api/v1/agent/conversations/{thread_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "cleared"

    # GET again -> empty
    get_again = client.get(f"/api/v1/agent/conversations/{thread_id}")
    assert get_again.status_code == 200
    assert get_again.json()["messages"] == []


def test_api_agent_validation_errors(client: TestClient):
    # Missing threadId
    res1 = client.post("/api/v1/agent/chat", json={"threadId": "", "message": "hello"})
    assert res1.status_code == 400

    # Empty message
    res2 = client.post("/api/v1/agent/chat", json={"threadId": "t1", "message": "   "})
    assert res2.status_code == 400

    # Stream with missing threadId
    res3 = client.post("/api/v1/agent/chat/stream", json={"threadId": "", "message": "hello"})
    assert res3.status_code == 400
