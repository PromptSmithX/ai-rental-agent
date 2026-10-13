from typing import Any, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.ai.schemas.state import AgentGraphState
from app.ai.nodes.understand_request import understand_request_node
from app.ai.nodes.update_preferences import update_preferences_node
from app.ai.nodes.resolve_location import resolve_location_node
from app.ai.nodes.search_rooms import search_rooms_node
from app.ai.nodes.suggest_relaxations import suggest_relaxations_node
from app.ai.nodes.rank_results import rank_results_node
from app.ai.nodes.room_detail import room_detail_node
from app.ai.nodes.compare_rooms import compare_rooms_node
from app.ai.nodes.clarification import clarification_node
from app.ai.nodes.generate_response import generate_response_node
from app.ai.graph.routing import (
    route_by_intent,
    route_after_location,
    route_after_search,
)


def build_agent_graph(checkpointer: Optional[Any] = None) -> Any:
    """Build and compile the controlled LangGraph workflow for AI Rental Copilot."""
    workflow = StateGraph(AgentGraphState)

    # 1. Register Nodes
    workflow.add_node("understand_request", understand_request_node)
    workflow.add_node("update_preferences", update_preferences_node)
    workflow.add_node("resolve_location", resolve_location_node)
    workflow.add_node("search_rooms", search_rooms_node)
    workflow.add_node("suggest_relaxations", suggest_relaxations_node)
    workflow.add_node("rank_results", rank_results_node)
    workflow.add_node("room_detail", room_detail_node)
    workflow.add_node("compare_rooms", compare_rooms_node)
    workflow.add_node("clarification", clarification_node)
    workflow.add_node("generate_response", generate_response_node)

    # 2. Sequential & Conditional Edges
    workflow.add_edge(START, "understand_request")
    workflow.add_edge("understand_request", "update_preferences")

    workflow.add_conditional_edges(
        "update_preferences",
        route_by_intent,
        {
            "resolve_location": "resolve_location",
            "room_detail": "room_detail",
            "compare_rooms": "compare_rooms",
            "clarification": "clarification",
            "generate_response": "generate_response",
        },
    )

    workflow.add_conditional_edges(
        "resolve_location",
        route_after_location,
        {
            "search_rooms": "search_rooms",
            "clarification": "clarification",
        },
    )

    workflow.add_conditional_edges(
        "search_rooms",
        route_after_search,
        {
            "suggest_relaxations": "suggest_relaxations",
            "rank_results": "rank_results",
        },
    )

    workflow.add_edge("suggest_relaxations", "rank_results")
    workflow.add_edge("rank_results", "generate_response")
    workflow.add_edge("room_detail", "generate_response")
    workflow.add_edge("compare_rooms", "generate_response")
    workflow.add_edge("clarification", "generate_response")
    workflow.add_edge("generate_response", END)

    # Default memory checkpointer if not provided
    cp = checkpointer if checkpointer is not None else MemorySaver()
    return workflow.compile(checkpointer=cp)


# Module-level default compiled graph
default_checkpointer = MemorySaver()
agent_graph = build_agent_graph(checkpointer=default_checkpointer)
