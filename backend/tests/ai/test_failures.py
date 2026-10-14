import os
from unittest.mock import MagicMock
import pytest
import httpx
from openai import APITimeoutError, RateLimitError, APIError
from app.ai.llm.client import (
    get_openai_client,
    execute_with_retries,
    OpenAIConfigurationError,
    OpenAITimeoutException,
    OpenAIProviderException,
)
from app.ai.llm.factory import set_extractor, set_response_generator
from app.ai.nodes.understand_request import understand_request_node
from app.ai.nodes.generate_response import generate_response_node
from app.ai.schemas.state import AgentGraphState


def test_missing_api_key_raises_configuration_error(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr("app.ai.config.ai_settings.OPENAI_API_KEY", None)
    monkeypatch.setattr("app.ai.llm.client._openai_client", None)

    with pytest.raises(OpenAIConfigurationError) as exc_info:
        get_openai_client()
    assert "OPENAI_API_KEY is not configured" in str(exc_info.value)


def test_retries_and_timeout_exception():
    mock_call = MagicMock()
    req = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
    mock_call.side_effect = APITimeoutError(request=req)

    with pytest.raises(OpenAITimeoutException):
        execute_with_retries(mock_call, max_retries=2, initial_backoff=0.01)

    # 1 initial + 2 retries = 3 total attempts
    assert mock_call.call_count == 3


def test_rate_limit_error_mapping():
    mock_call = MagicMock()
    mock_call.side_effect = RateLimitError(
        message="Rate limit reached",
        response=MagicMock(status_code=429),
        body={"error": {"message": "Rate limit"}},
    )

    with pytest.raises(OpenAIProviderException):
        execute_with_retries(mock_call, max_retries=1, initial_backoff=0.01)

    assert mock_call.call_count == 2


def test_extractor_node_graceful_fallback_on_openai_error():
    # Setup mock extractor that raises OpenAITimeoutException
    failing_extractor = MagicMock()
    failing_extractor.extract.side_effect = OpenAITimeoutException("Timeout calling OpenAI")
    set_extractor(failing_extractor)

    try:
        state: AgentGraphState = {
            "run_id": "test-fail-run",
            "user_message": "Tìm phòng dưới 3 triệu quanh Bách Khoa Hà Nội trong 2 km",
            "events": [],
            "canonical_filters": {},
            "last_result_room_ids": [],
        }

        # Should NOT crash: gracefully uses MockExtractor and adds warning event
        res = understand_request_node(state)

        assert res["intent"] == "search"
        event_types = [e["type"] for e in res["events"]]
        assert "tool_failed" in event_types
        assert "preferences_extracted" in event_types
    finally:
        set_extractor(None)


def test_generator_node_graceful_fallback_on_openai_error():
    # Setup mock generator that raises OpenAIProviderException
    failing_gen = MagicMock()
    failing_gen.generate.side_effect = OpenAIProviderException("API 500 error")
    set_response_generator(failing_gen)

    try:
        state: AgentGraphState = {
            "run_id": "test-gen-fail",
            "thread_id": "test-thread",
            "user_message": "Có phòng nào hết hạn không?",
            "intent": "general_question",
            "events": [],
            "canonical_filters": {},
            "messages": [],
        }

        # Should NOT crash: gracefully uses MockResponseGenerator and adds warning event
        res = generate_response_node(state)

        assert res["status"] == "completed"
        assert res["final_response_text"] is not None
        event_types = [e["type"] for e in res["events"]]
        assert "tool_failed" in event_types
        assert "response_ready" in event_types
        assert "run_completed" in event_types
    finally:
        set_response_generator(None)
