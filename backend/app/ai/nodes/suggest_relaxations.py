from typing import Any, Dict
from app.schemas.search import SearchFilters
from app.ai.schemas.state import AgentGraphState
from app.ai.dependencies import get_agent_repository
from app.ai.tools.relaxation_tool import suggest_filter_relaxations


def suggest_relaxations_node(state: AgentGraphState) -> Dict[str, Any]:
    """Node 5b: Query real candidate counts for filter relaxation when search yields 0 hits."""
    repo = get_agent_repository()
    filters_dict = state.get("canonical_filters", {})
    filters = SearchFilters(**filters_dict) if filters_dict else SearchFilters()

    suggestions = suggest_filter_relaxations(filters, repo)

    return {
        "relaxation_options": [s.model_dump() for s in suggestions],
    }
