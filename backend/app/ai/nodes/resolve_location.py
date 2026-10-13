from datetime import datetime, timezone
from typing import Any, Dict
from app.ai.schemas.state import AgentGraphState
from app.ai.dependencies import get_agent_repository
from app.ai.tools.campus_tool import resolve_campus


def resolve_location_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 3: Resolve campus query against registered university campuses."""
    repo = get_agent_repository()
    run_id = state.get("run_id", "run-init")
    events = list(state.get("events", []))
    canonical_filters = dict(state.get("canonical_filters", {}))
    campus_query = state.get("campus_query") or canonical_filters.get("campus_id")

    res = resolve_campus(campus_query, repo)

    if res.is_ambiguous or not res.campus_id:
        cand_names = [f"• {c.university_name} ({c.campus_name})" for c in res.candidates[:4]]
        cand_str = "\n".join(cand_names)
        question = (
            "Bạn muốn tìm phòng gần cơ sở trường nào? Vui lòng chọn hoặc nêu rõ tên trường:\n"
            f"{cand_str}"
            if cand_names
            else "Bạn muốn tìm phòng quanh trường đại học nào? Vui lòng nêu rõ tên trường."
        )
        return {
            "needs_clarification": True,
            "clarification_question": question,
            "status": "needs_clarification",
        }

    canonical_filters["campus_id"] = res.campus_id
    events.append({
        "id": f"evt-{run_id}-campus",
        "runId": run_id,
        "type": "campus_resolved",
        "status": "success",
        "label": f"Xác định cơ sở: {res.canonical_name}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "durationMs": 30,
        "isSimulation": True,
        "details": {
            "campusId": res.campus_id,
            "canonicalName": res.canonical_name,
            "latitude": res.latitude,
            "longitude": res.longitude,
        },
    })

    return {
        "canonical_filters": canonical_filters,
        "active_campus_id": res.campus_id,
        "needs_clarification": False,
        "events": events,
    }
