from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.schemas.search import SearchFilters, SearchResult
from app.ai.schemas.events import AgentEventSchema, AgentEventType, EventStatus
from app.ai.schemas.responses import AgentChatResponse, ChatMessageDTO
from app.ai.graph.builder import agent_graph


class AgentService:
    """Coordinates execution of the LangGraph workflow and maps output to AgentChatResponse."""

    def __init__(self, graph: Optional[Any] = None):
        self.graph = graph if graph is not None else agent_graph

    def run_turn(
        self,
        thread_id: str,
        message: str,
        current_filters: Optional[SearchFilters] = None,
    ) -> AgentChatResponse:
        run_id = f"run-{int(datetime.now().timestamp() * 1000)}"
        now = datetime.now(timezone.utc).isoformat()

        # 1. Initial run_started event
        init_event: Dict[str, Any] = {
            "id": f"evt-{run_id}-start",
            "runId": run_id,
            "type": "run_started",
            "status": "success",
            "label": "Khởi tạo tác vụ tìm kiếm",
            "timestamp": now,
            "durationMs": 15,
            "isSimulation": True,
            "details": {
                "userMessage": message,
                "threadId": thread_id,
            },
        }

        # 2. Prepare state
        input_state: Dict[str, Any] = {
            "thread_id": thread_id,
            "user_message": message,
            "run_id": run_id,
            "events": [init_event],
        }

        if current_filters:
            input_state["canonical_filters"] = current_filters.model_dump()
            input_state["active_campus_id"] = current_filters.campus_id

        config = {"configurable": {"thread_id": thread_id}}

        # 3. Invoke compiled StateGraph
        final_state = self.graph.invoke(input_state, config=config)

        # 4. Extract results
        messages = final_state.get("messages", [])
        last_msg = messages[-1] if messages else {
            "id": f"asst-{int(datetime.now().timestamp() * 1000)}",
            "threadId": thread_id,
            "role": "assistant",
            "content": final_state.get("final_response_text", ""),
            "createdAt": now,
            "referencedRoomIds": [],
        }

        chat_msg = ChatMessageDTO(
            id=last_msg.get("id", f"asst-{run_id}"),
            thread_id=thread_id,
            role="assistant",
            content=last_msg.get("content", ""),
            created_at=last_msg.get("createdAt", now),
            referenced_room_ids=last_msg.get("referencedRoomIds", []),
        )

        search_res = (
            SearchResult(**final_state["search_result"])
            if final_state.get("search_result")
            else None
        )

        final_filters = final_state.get("canonical_filters", {})
        filter_patch = {}
        if current_filters:
            old_dict = current_filters.model_dump()
            for k, v in final_filters.items():
                if old_dict.get(k) != v:
                    filter_patch[k] = v
        else:
            filter_patch = final_filters

        events = [
            AgentEventSchema(
                id=evt.get("id", f"evt-{run_id}"),
                run_id=evt.get("runId", run_id),
                type=AgentEventType(evt["type"]),
                status=EventStatus(evt.get("status", "success")),
                label=evt.get("label", ""),
                timestamp=evt.get("timestamp", now),
                duration_ms=evt.get("durationMs"),
                is_simulation=evt.get("isSimulation", True),
                details=evt.get("details", {}),
            )
            for evt in final_state.get("events", [])
        ]

        return AgentChatResponse(
            run_id=run_id,
            thread_id=thread_id,
            status=final_state.get("status", "completed"),
            message=chat_msg,
            filter_patch=filter_patch,
            result=search_res,
            events=events,
            clarification_question=final_state.get("clarification_question"),
            is_simulation=True,
        )


agent_service = AgentService()
