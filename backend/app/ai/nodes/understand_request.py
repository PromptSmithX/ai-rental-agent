from datetime import datetime, timezone
from typing import Any, Dict
from app.schemas.search import SearchFilters
from app.ai.schemas.state import AgentGraphState
from app.ai.llm.factory import get_extractor
from app.ai.llm.client import OpenAIProviderException, OpenAITimeoutException, OpenAIConfigurationError
from app.ai.llm.mock_llm import MockExtractor


def understand_request_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 1: Extract intent, filter operations, and referents from user utterance."""
    user_msg = state.get("user_message", "")
    canonical_filters_dict = state.get("canonical_filters", {})
    last_hits = state.get("last_result_room_ids", [])
    run_id = state.get("run_id", "run-init")
    events = list(state.get("events", []))

    # Parse canonical filters
    curr_filters = SearchFilters(**canonical_filters_dict) if canonical_filters_dict else SearchFilters()

    extractor = get_extractor()
    try:
        extracted = extractor.extract(
            user_message=user_msg,
            current_filters=curr_filters,
            last_result_room_ids=last_hits,
        )
    except (OpenAITimeoutException, OpenAIProviderException, OpenAIConfigurationError) as e:
        # Graceful fallback: log sanitized event and use mock extractor
        events.append({
            "id": f"evt-{run_id}-extract-warning",
            "runId": run_id,
            "type": "tool_failed",
            "status": "error",
            "label": "OpenAI gặp sự cố, tự động dùng bộ trích xuất dự phòng",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "durationMs": 10,
            "isSimulation": True,
            "details": {"error": str(e)},
        })
        extracted = MockExtractor.extract(
            user_message=user_msg,
            current_filters=curr_filters,
            last_result_room_ids=last_hits,
        )

    events.append({
        "id": f"evt-{run_id}-extract",
        "runId": run_id,
        "type": "preferences_extracted",
        "status": "success",
        "label": "Trích xuất tiêu chí tìm kiếm",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "durationMs": 45,
        "isSimulation": True,
        "details": {
            "intent": extracted.intent.value,
            "operationsCount": len(extracted.operations),
        },
    })

    return {
        "intent": extracted.intent.value,
        "extracted_operations": [op.model_dump() for op in extracted.operations],
        "campus_query": extracted.campus_query,
        "target_room_ids": extracted.target_room_ids,
        "room_reference_index": extracted.room_reference_index,
        "needs_clarification": extracted.needs_clarification,
        "clarification_question": extracted.clarification_reason,
        "events": events,
    }
