import pytest
from app.ai.schemas.intent import UserIntent
from app.ai.graph.routing import (
    route_by_intent,
    route_after_location,
    route_after_search,
)


def test_route_by_intent():
    # Clarification flag forces clarification
    assert route_by_intent({"needs_clarification": True}) == "clarification"

    # Search and Refine route to resolve_location
    assert route_by_intent({"intent": UserIntent.SEARCH.value}) == "resolve_location"
    assert route_by_intent({"intent": UserIntent.REFINE.value}) == "resolve_location"

    # Room detail routes to room_detail
    assert route_by_intent({"intent": UserIntent.ROOM_DETAIL.value}) == "room_detail"

    # Compare routes to compare_rooms
    assert route_by_intent({"intent": UserIntent.COMPARE.value}) == "compare_rooms"

    # Clarify & Unsupported route to clarification
    assert route_by_intent({"intent": UserIntent.CLARIFY.value}) == "clarification"
    assert route_by_intent({"intent": UserIntent.UNSUPPORTED.value}) == "clarification"

    # General question routes directly to generate_response
    assert route_by_intent({"intent": UserIntent.GENERAL_QUESTION.value}) == "generate_response"


def test_route_after_location():
    # Needs clarification -> clarification
    assert route_after_location({"needs_clarification": True}) == "clarification"

    # Valid location -> search_rooms
    assert route_after_location({"needs_clarification": False}) == "search_rooms"


def test_route_after_search():
    # Results found -> rank_results
    assert route_after_search({"search_result": {"total_matched": 3}}) == "rank_results"

    # Zero results -> suggest_relaxations
    assert route_after_search({"search_result": {"total_matched": 0}}) == "suggest_relaxations"
