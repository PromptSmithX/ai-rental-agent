from datetime import datetime, timezone
from typing import Any, Dict, List
from app.ai.llm.factory import is_simulation_mode
from app.ai.schemas.state import AgentGraphState
from app.ai.dependencies import get_agent_repository
from app.ai.tools.compare_tool import compare_rooms


def compare_rooms_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 7: Build side-by-side comparison matrix for 2-3 rooms."""
    repo = get_agent_repository()
    run_id = state.get("run_id", "run-init")
    events = list(state.get("events", []))
    target_ids = list(state.get("target_room_ids", []))
    ref_idx = state.get("room_reference_index")
    last_hits = state.get("last_result_room_ids", [])
    active_campus_id = state.get("active_campus_id")

    # If reference index is given (e.g. "so sánh 2 phòng đầu"), take from last search hits
    if not target_ids and ref_idx is not None:
        target_ids = last_hits[:2]

    # If only 1 target ID provided but 2 needed, try to supplement from last_hits
    if len(target_ids) < 2 and len(last_hits) >= 2:
        for hit in last_hits:
            if hit not in target_ids:
                target_ids.append(hit)
            if len(target_ids) >= 2:
                break

    comparison = compare_rooms(target_ids, repo, active_campus_id)

    events.append({
        "id": f"evt-{run_id}-compare",
        "runId": run_id,
        "type": "rooms_searched",
        "status": "success",
        "label": f"So sánh {len(comparison.rooms)} phòng",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "durationMs": 40,
        "isSimulation": is_simulation_mode(),
        "details": {
            "comparedRoomIds": [r.id for r in comparison.rooms],
        },
    })

    return {
        "comparison_result": comparison.model_dump(),
        "compared_room_ids": [r.id for r in comparison.rooms],
        "events": events,
    }
