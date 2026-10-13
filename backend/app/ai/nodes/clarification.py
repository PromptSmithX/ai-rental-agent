from datetime import datetime, timezone
from typing import Any, Dict
from app.ai.schemas.state import AgentGraphState


def clarification_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 8: Prepare structured clarification for ambiguous request or missing campus."""
    run_id = state.get("run_id", "run-init")
    events = list(state.get("events", []))
    q = state.get("clarification_question") or "Vui lòng cung cấp thêm thông tin để mình hỗ trợ tìm phòng chính xác hơn."

    events.append({
        "id": f"evt-{run_id}-clarify",
        "runId": run_id,
        "type": "clarification_required",
        "status": "success",
        "label": "Yêu cầu làm rõ thông tin",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "durationMs": 20,
        "isSimulation": True,
        "details": {
            "question": q,
        },
    })

    return {
        "status": "needs_clarification",
        "clarification_question": q,
        "events": events,
    }
