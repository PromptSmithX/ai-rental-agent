import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union
from app.ai.llm.factory import is_simulation_mode
from app.ai.schemas.events import AgentEventSchema, AgentEventType, EventStatus


class EventMapper:
    """Sanitizes and maps internal graph events to typed public AgentEventSchema instances."""

    @staticmethod
    def sanitize_details(details: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Strip raw credentials, system prompts, or stack traces from public event details."""
        if not details:
            return {}

        sanitized: Dict[str, Any] = {}
        sensitive_keywords = {"api_key", "password", "token", "secret", "traceback", "prompt"}

        for k, v in details.items():
            if any(s in k.lower() for s in sensitive_keywords):
                continue
            # Keep only JSON-serializable safe primitives
            if isinstance(v, (str, int, float, bool, type(None))):
                sanitized[k] = v
            elif isinstance(v, (list, tuple)):
                # Keep list if items are primitives
                sanitized[k] = [
                    item for item in v
                    if isinstance(item, (str, int, float, bool, type(None)))
                ][:10]
            elif isinstance(v, dict):
                sanitized[k] = EventMapper.sanitize_details(v)
            else:
                sanitized[k] = str(v)

        return sanitized

    @classmethod
    def to_schema(cls, raw: Dict[str, Any], fallback_run_id: str) -> AgentEventSchema:
        """Map raw event dictionary from graph state to strictly typed AgentEventSchema."""
        now = datetime.now(timezone.utc).isoformat()
        evt_type_val = raw.get("type", "tool_completed")
        try:
            evt_type = AgentEventType(evt_type_val)
        except ValueError:
            evt_type = AgentEventType.TOOL_COMPLETED

        raw_status = raw.get("status", "success")
        try:
            status = EventStatus(raw_status)
        except ValueError:
            status = EventStatus.SUCCESS

        return AgentEventSchema(
            id=raw.get("id", f"evt-{fallback_run_id}-{int(datetime.now().timestamp() * 1000)}"),
            run_id=raw.get("runId", fallback_run_id),
            type=evt_type,
            status=status,
            label=raw.get("label", "Tác vụ hệ thống"),
            timestamp=raw.get("timestamp", now),
            duration_ms=raw.get("durationMs", 10),
            is_simulation=raw.get("isSimulation", is_simulation_mode()),
            details=cls.sanitize_details(raw.get("details", {})),
        )

    @staticmethod
    def format_sse(event_name: str, data: Union[AgentEventSchema, Dict[str, Any]]) -> str:
        """Format payload as a standard Server-Sent Event (SSE) block."""
        if hasattr(data, "model_dump"):
            payload = data.model_dump(mode="json", by_alias=True)
        elif hasattr(data, "dict"):
            payload = data.dict()
        else:
            payload = data

        json_data = json.dumps(payload, ensure_ascii=False, default=str)
        return f"event: {event_name}\ndata: {json_data}\n\n"
