import json
import pytest
from app.ai.schemas.events import AgentEventSchema, AgentEventType, EventStatus
from app.ai.services.event_mapper import EventMapper


def test_agent_event_schema_camelcase_serialization():
    evt = AgentEventSchema(
        id="evt-test-1",
        run_id="run-test-1",
        type=AgentEventType.ROOMS_SEARCHED,
        status=EventStatus.SUCCESS,
        label="Tìm kiếm phòng trong cơ sở dữ liệu",
        timestamp="2026-10-13T12:00:00Z",
        duration_ms=45,
        is_simulation=True,
        details={"totalFound": 3, "campusId": "hust-hanoi"},
    )

    dumped = evt.model_dump(by_alias=True)
    assert dumped["id"] == "evt-test-1"
    assert dumped["runId"] == "run-test-1"
    assert dumped["type"] == "rooms_searched"
    assert dumped["status"] == "success"
    assert dumped["label"] == "Tìm kiếm phòng trong cơ sở dữ liệu"
    assert dumped["timestamp"] == "2026-10-13T12:00:00Z"
    assert dumped["durationMs"] == 45
    assert dumped["isSimulation"] is True
    assert dumped["details"] == {"totalFound": 3, "campusId": "hust-hanoi"}


def test_event_mapper_sanitize_sensitive_details():
    raw_details = {
        "userQuery": "tìm phòng trọ",
        "api_key": "sk-secret-123456",
        "secret_token": "abc-token",
        "nested": {
            "password": "123",
            "clean_field": "ok",
        },
        "traceback": "Traceback (most recent call last)...",
        "count": 5,
        "is_active": True,
    }

    sanitized = EventMapper.sanitize_details(raw_details)

    assert "api_key" not in sanitized
    assert "secret_token" not in sanitized
    assert "traceback" not in sanitized
    assert "password" not in sanitized.get("nested", {})
    assert sanitized["userQuery"] == "tìm phòng trọ"
    assert sanitized["count"] == 5
    assert sanitized["is_active"] is True
    assert sanitized["nested"]["clean_field"] == "ok"


def test_event_mapper_to_schema_conversion():
    raw_event = {
        "id": "evt-raw-1",
        "runId": "run-001",
        "type": "campus_resolved",
        "status": "success",
        "label": "Xác định cơ sở đào tạo",
        "timestamp": "2026-10-13T12:05:00Z",
        "durationMs": 20,
        "isSimulation": True,
        "details": {"campusId": "vnu-hanoi"},
    }

    schema = EventMapper.to_schema(raw_event, fallback_run_id="run-001")
    assert isinstance(schema, AgentEventSchema)
    assert schema.id == "evt-raw-1"
    assert schema.type == AgentEventType.CAMPUS_RESOLVED
    assert schema.status == EventStatus.SUCCESS
    assert schema.details["campusId"] == "vnu-hanoi"


def test_event_mapper_sse_formatting():
    evt = AgentEventSchema(
        id="evt-sse-1",
        run_id="run-sse-1",
        type=AgentEventType.RUN_STARTED,
        status=EventStatus.SUCCESS,
        label="Bắt đầu tác vụ",
        timestamp="2026-10-13T12:10:00Z",
        duration_ms=10,
        is_simulation=True,
        details={"userMessage": "tìm phòng"},
    )

    sse_block = EventMapper.format_sse("agent_event", evt)
    assert sse_block.startswith("event: agent_event\ndata: ")
    assert sse_block.endswith("\n\n")

    # Extract JSON line
    lines = sse_block.strip().split("\n")
    assert lines[0] == "event: agent_event"
    data_json = json.loads(lines[1].replace("data: ", ""))
    assert data_json["id"] == "evt-sse-1"
    assert data_json["runId"] == "run-sse-1"
    assert data_json["type"] == "run_started"
