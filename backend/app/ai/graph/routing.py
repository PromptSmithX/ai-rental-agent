from app.ai.schemas.intent import UserIntent
from app.ai.schemas.state import AgentGraphState


def route_by_intent(state: AgentGraphState) -> str:
    """Deterministic routing after request understanding and preferences update."""
    if state.get("needs_clarification"):
        return "clarification"

    intent_str = state.get("intent", UserIntent.SEARCH.value)

    if intent_str in (UserIntent.SEARCH.value, UserIntent.REFINE.value):
        return "resolve_location"
    elif intent_str == UserIntent.ROOM_DETAIL.value:
        return "room_detail"
    elif intent_str == UserIntent.COMPARE.value:
        return "compare_rooms"
    elif intent_str in (UserIntent.CLARIFY.value, UserIntent.UNSUPPORTED.value):
        return "clarification"
    elif intent_str == UserIntent.GENERAL_QUESTION.value:
        return "generate_response"

    return "clarification"


def route_after_location(state: AgentGraphState) -> str:
    """Route after location resolution: to search or to clarification if campus ambiguous."""
    if state.get("needs_clarification"):
        return "clarification"
    return "search_rooms"


def route_after_search(state: AgentGraphState) -> str:
    """Route after search: to rank_results or suggest_relaxations if 0 hits."""
    search_res = state.get("search_result")
    if search_res and search_res.get("total_matched", 0) == 0:
        return "suggest_relaxations"
    return "rank_results"
