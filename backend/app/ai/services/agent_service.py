from datetime import datetime, timezone
from typing import Any, Dict, Generator, List, Optional
from app.schemas.search import SearchFilters, SearchResult
from app.ai.llm.factory import is_simulation_mode
from app.ai.schemas.events import AgentEventSchema
from app.ai.schemas.responses import AgentChatResponse, ChatMessageDTO
from app.ai.services.event_mapper import EventMapper
from app.ai.graph.builder import agent_graph


class AgentService:
    """Coordinates execution of the LangGraph workflow and maps output to AgentChatResponse."""

    def __init__(self, graph: Optional[Any] = None):
        self.graph = graph if graph is not None else agent_graph

    def _build_response(
        self,
        final_state: Dict[str, Any],
        thread_id: str,
        run_id: str,
        current_filters: Optional[SearchFilters],
        now: str,
    ) -> AgentChatResponse:
        """Extract and structure final graph state into AgentChatResponse."""
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
            EventMapper.to_schema(evt, run_id)
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
            is_simulation=is_simulation_mode(),
        )

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
            "isSimulation": is_simulation_mode(),
            "details": {
                "userMessage": message,
                "threadId": thread_id,
            },
        }

        # 2. Prepare state with ephemeral reset
        input_state: Dict[str, Any] = {
            "thread_id": thread_id,
            "user_message": message,
            "run_id": run_id,
            "events": [init_event],
            "search_result": None,
            "detail_result": None,
            "comparison_result": None,
            "relaxation_options": [],
            "needs_clarification": False,
            "clarification_question": None,
            "final_response_text": None,
            "status": "extracting",
            "error": None,
        }

        if current_filters:
            input_state["canonical_filters"] = current_filters.model_dump()
            input_state["active_campus_id"] = current_filters.campus_id

        config = {"configurable": {"thread_id": thread_id}}

        # 3. Invoke compiled StateGraph
        final_state = self.graph.invoke(input_state, config=config)

        # 4. Extract results
        return self._build_response(
            final_state=final_state,
            thread_id=thread_id,
            run_id=run_id,
            current_filters=current_filters,
            now=now,
        )

    def stream_turn(
        self,
        thread_id: str,
        message: str,
        current_filters: Optional[SearchFilters] = None,
    ) -> Generator[str, None, None]:
        """Stream execution events and final AgentReply via Server-Sent Events (SSE)."""
        run_id = f"run-{int(datetime.now().timestamp() * 1000)}"
        now = datetime.now(timezone.utc).isoformat()

        init_event: Dict[str, Any] = {
            "id": f"evt-{run_id}-start",
            "runId": run_id,
            "type": "run_started",
            "status": "success",
            "label": "Khởi tạo tác vụ tìm kiếm",
            "timestamp": now,
            "durationMs": 15,
            "isSimulation": is_simulation_mode(),
            "details": {
                "userMessage": message,
                "threadId": thread_id,
            },
        }

        # 1. Emit run_started immediately
        init_schema = EventMapper.to_schema(init_event, run_id)
        yield EventMapper.format_sse("agent_event", init_schema)
        emitted_ids = {init_event["id"]}

        # 2. Prepare input state with ephemeral reset
        input_state: Dict[str, Any] = {
            "thread_id": thread_id,
            "user_message": message,
            "run_id": run_id,
            "events": [init_event],
            "search_result": None,
            "detail_result": None,
            "comparison_result": None,
            "relaxation_options": [],
            "needs_clarification": False,
            "clarification_question": None,
            "final_response_text": None,
            "status": "extracting",
            "error": None,
        }

        if current_filters:
            input_state["canonical_filters"] = current_filters.model_dump()
            input_state["active_campus_id"] = current_filters.campus_id

        config = {"configurable": {"thread_id": thread_id}}

        try:
            # 3. Stream graph execution step by step
            for step_update in self.graph.stream(input_state, config=config, stream_mode="updates"):
                for node_name, node_output in step_update.items():
                    if isinstance(node_output, dict) and "events" in node_output:
                        for evt in node_output["events"]:
                            evt_id = evt.get("id")
                            if evt_id and evt_id not in emitted_ids:
                                emitted_ids.add(evt_id)
                                schema = EventMapper.to_schema(evt, run_id)
                                yield EventMapper.format_sse("agent_event", schema)

            # 4. Get final state and yield completed reply
            snapshot = self.graph.get_state(config)
            final_state = snapshot.values if snapshot else {}
            response_dto = self._build_response(
                final_state=final_state,
                thread_id=thread_id,
                run_id=run_id,
                current_filters=current_filters,
                now=now,
            )
            yield EventMapper.format_sse("agent_reply", response_dto)

        except Exception as e:
            yield EventMapper.format_sse("agent_error", {"detail": str(e), "runId": run_id})

    def get_conversation(self, thread_id: str) -> Dict[str, Any]:
        """Retrieve conversation snapshot and history from checkpoint memory."""
        config = {"configurable": {"thread_id": thread_id}}
        snapshot = self.graph.get_state(config)
        state = snapshot.values if snapshot else {}
        return {
            "threadId": thread_id,
            "canonicalFilters": state.get("canonical_filters", {}),
            "activeCampusId": state.get("active_campus_id"),
            "messages": state.get("messages", []),
            "lastResultRoomIds": state.get("last_result_room_ids", []),
        }

    def clear_conversation(self, thread_id: str) -> bool:
        """Reset conversation state in checkpointer."""
        config = {"configurable": {"thread_id": thread_id}}
        self.graph.update_state(
            config,
            {
                "messages": [],
                "canonical_filters": {},
                "active_campus_id": None,
                "last_result_room_ids": [],
            },
        )
        return True


agent_service = AgentService()
