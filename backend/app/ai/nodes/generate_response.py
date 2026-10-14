from datetime import datetime, timezone
from typing import Any, Dict
from app.schemas.search import SearchFilters, SearchResult
from app.schemas.room import RoomView
from app.ai.schemas.intent import UserIntent
from app.ai.schemas.state import AgentGraphState
from app.ai.tools.compare_tool import RoomComparisonResult
from app.ai.tools.relaxation_tool import RelaxationSuggestion
from app.ai.llm.factory import get_response_generator
from app.ai.llm.client import OpenAITimeoutException, OpenAIProviderException, OpenAIConfigurationError
from app.ai.llm.mock_llm import MockResponseGenerator


def generate_response_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 9: Synthesize factual Vietnamese response strictly grounded in tool data."""
    run_id = state.get("run_id", "run-init")
    events = list(state.get("events", []))
    thread_id = state.get("thread_id", "default-thread")
    user_msg = state.get("user_message", "")
    intent_str = state.get("intent", "search")
    filters_dict = state.get("canonical_filters", {})
    status = state.get("status", "completed")

    intent = UserIntent(intent_str) if intent_str in [i.value for i in UserIntent] else UserIntent.SEARCH
    filters = SearchFilters(**filters_dict) if filters_dict else SearchFilters()

    search_result = SearchResult(**state["search_result"]) if state.get("search_result") else None
    detail_result = RoomView(**state["detail_result"]) if state.get("detail_result") else None
    comparison_result = (
        RoomComparisonResult(**state["comparison_result"])
        if state.get("comparison_result")
        else None
    )
    relaxation_options = (
        [RelaxationSuggestion(**r) for r in state["relaxation_options"]]
        if state.get("relaxation_options")
        else None
    )
    clarification_q = state.get("clarification_question")

    generator = get_response_generator()
    try:
        answer = generator.generate(
            user_message=user_msg,
            intent=intent,
            filters=filters,
            search_result=search_result,
            detail_result=detail_result,
            comparison_result=comparison_result,
            relaxation_options=relaxation_options,
            clarification_question=clarification_q,
        )
    except (OpenAITimeoutException, OpenAIProviderException, OpenAIConfigurationError) as e:
        events.append({
            "id": f"evt-{run_id}-gen-warning",
            "runId": run_id,
            "type": "tool_failed",
            "status": "error",
            "label": "OpenAI gặp sự cố, tự động dùng bộ sinh phản hồi dự phòng",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "durationMs": 10,
            "isSimulation": True,
            "details": {"error": str(e)},
        })
        answer = MockResponseGenerator.generate(
            user_message=user_msg,
            intent=intent,
            filters=filters,
            search_result=search_result,
            detail_result=detail_result,
            comparison_result=comparison_result,
            relaxation_options=relaxation_options,
            clarification_question=clarification_q,
        )

    # Determine referenced room IDs for the UI
    referenced_ids = []
    if detail_result:
        referenced_ids = [detail_result.id]
    elif comparison_result and comparison_result.rooms:
        referenced_ids = [r.id for r in comparison_result.rooms]
    elif search_result and search_result.hits:
        referenced_ids = [h.room_id for h in search_result.hits[:3]]

    now = datetime.now(timezone.utc).isoformat()
    assistant_msg = {
        "id": f"asst-{int(datetime.now().timestamp() * 1000)}",
        "threadId": thread_id,
        "role": "assistant",
        "content": answer,
        "createdAt": now,
        "referencedRoomIds": referenced_ids,
    }

    events.append({
        "id": f"evt-{run_id}-response",
        "runId": run_id,
        "type": "response_ready",
        "status": "success",
        "label": "Tổng hợp câu trả lời cho người dùng",
        "timestamp": now,
        "durationMs": 35,
        "isSimulation": True,
        "details": {
            "answerLength": len(answer),
            "referencedCount": len(referenced_ids),
        },
    })

    terminal_status = status if status in ("needs_clarification", "failed") else "completed"

    events.append({
        "id": f"evt-{run_id}-complete",
        "runId": run_id,
        "type": "run_completed",
        "status": "success",
        "label": "Hoàn tất xử lý yêu cầu",
        "timestamp": now,
        "durationMs": 10,
        "isSimulation": True,
        "details": {
            "status": terminal_status,
        },
    })

    user_msg_item = {
        "id": f"user-{run_id}",
        "threadId": thread_id,
        "role": "user",
        "content": user_msg,
        "createdAt": now,
        "referencedRoomIds": [],
    }

    current_messages = list(state.get("messages", []))
    current_messages.append(user_msg_item)
    current_messages.append(assistant_msg)

    return {
        "final_response_text": answer,
        "status": terminal_status,
        "messages": current_messages,
        "events": events,
    }
