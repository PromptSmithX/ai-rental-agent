from datetime import datetime, timezone
from typing import Any, Dict
from app.schemas.search import SearchFilters
from app.ai.llm.factory import is_simulation_mode
from app.ai.schemas.state import AgentGraphState
from app.ai.dependencies import get_agent_repository
from app.ai.tools.search_tool import search_rooms


def search_rooms_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 4: Execute structured room search with strict hard-filters."""
    repo = get_agent_repository()
    run_id = state.get("run_id", "run-init")
    events = list(state.get("events", []))
    filters_dict = state.get("canonical_filters", {})

    filters = SearchFilters(**filters_dict) if filters_dict else SearchFilters()
    result = search_rooms(filters, repo)

    hit_ids = [hit.room_id for hit in result.hits]

    events.append({
        "id": f"evt-{run_id}-search",
        "runId": run_id,
        "type": "rooms_searched",
        "status": "success",
        "label": f"Tìm thấy {result.total_matched} phòng thỏa tiêu chí",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "durationMs": 55,
        "isSimulation": is_simulation_mode(),
        "details": {
            "totalMatched": result.total_matched,
            "appliedFilters": filters.model_dump(),
        },
    })

    if filters.max_distance_km is not None:
        events.append({
            "id": f"evt-{run_id}-distance",
            "runId": run_id,
            "type": "distance_filtered",
            "status": "success",
            "label": f"Lọc bán kính đường chim bay ≤ {filters.max_distance_km} km",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "durationMs": 20,
            "isSimulation": is_simulation_mode(),
            "details": {
                "maxDistanceKm": filters.max_distance_km,
            },
        })

    return {
        "search_result": result.model_dump(),
        "last_result_room_ids": hit_ids,
        "events": events,
    }
