from datetime import datetime, timezone
from typing import Any, Dict
from app.ai.schemas.state import AgentGraphState


def rank_results_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 5: Finalize ranked results and update selected room."""
    run_id = state.get("run_id", "run-init")
    events = list(state.get("events", []))
    hit_ids = state.get("last_result_room_ids", [])

    events.append({
        "id": f"evt-{run_id}-rank",
        "runId": run_id,
        "type": "rooms_ranked",
        "status": "success",
        "label": f"Xếp hạng {len(hit_ids)} phòng theo tiêu chí",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "durationMs": 25,
        "isSimulation": True,
        "details": {
            "topRoomIds": hit_ids[:3],
        },
    })

    top_selected = hit_ids[0] if hit_ids else state.get("selected_room_id")

    return {
        "selected_room_id": top_selected,
        "events": events,
    }
