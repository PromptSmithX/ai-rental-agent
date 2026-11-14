from typing import Any, Dict
from app.schemas.search import SearchFilters
from app.ai.schemas.state import AgentGraphState
from app.ai.state.filter_ops import merge_filter_operations


def update_preferences_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 2: Deterministically merge extracted filter operations into canonical filters."""
    curr_filters_dict = state.get("canonical_filters", {})
    ops = state.get("extracted_operations", [])

    current_filters = SearchFilters(**curr_filters_dict) if curr_filters_dict else SearchFilters()
    merged = merge_filter_operations(current_filters, ops)

    return {
        "canonical_filters": merged.model_dump(),
        "active_campus_id": merged.campus_id,
    }
