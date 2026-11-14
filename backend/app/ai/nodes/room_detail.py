from datetime import datetime, timezone
from typing import Any, Dict
from app.ai.llm.factory import is_simulation_mode
from app.ai.schemas.state import AgentGraphState
from app.ai.dependencies import get_agent_repository
from app.ai.tools.detail_tool import get_room_details


def room_detail_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 6: Retrieve details for a specific room listing."""
    repo = get_agent_repository()
    run_id = state.get("run_id", "run-init")
    events = list(state.get("events", []))
    target_ids = state.get("target_room_ids", [])
    ref_idx = state.get("room_reference_index")
    last_hits = state.get("last_result_room_ids", [])

    room_id = None
    if target_ids:
        room_id = target_ids[0]
    elif ref_idx is not None and 0 <= ref_idx < len(last_hits):
        room_id = last_hits[ref_idx]

    detail = get_room_details(room_id, repo) if room_id else None

    events.append({
        "id": f"evt-{run_id}-detail",
        "runId": run_id,
        "type": "rooms_searched",
        "status": "success" if detail else "error",
        "label": f"Xem chi tiết phòng {room_id}" if room_id else "Không tìm thấy phòng",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "durationMs": 35,
        "isSimulation": is_simulation_mode(),
        "details": {
            "roomId": room_id,
            "found": detail is not None,
        },
    })

    return {
        "detail_result": detail.model_dump() if detail else None,
        "selected_room_id": room_id if detail else state.get("selected_room_id"),
        "events": events,
    }
