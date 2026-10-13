from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class AgentGraphState(TypedDict, total=False):
    """LangGraph typed graph state for AI Rental Copilot."""
    
    # --- PERSISTENT CONVERSATION STATE ---
    thread_id: str
    messages: List[Dict[str, Any]]
    canonical_filters: Dict[str, Any]
    active_campus_id: Optional[str]
    last_result_room_ids: List[str]
    selected_room_id: Optional[str]
    compared_room_ids: List[str]

    # --- EPHEMERAL EXECUTION STATE (Current Turn) ---
    run_id: str
    user_message: str
    intent: str
    extracted_operations: List[Dict[str, Any]]
    campus_query: Optional[str]
    target_room_ids: List[str]
    room_reference_index: Optional[int]
    
    # Tool outputs
    search_result: Optional[Dict[str, Any]]
    detail_result: Optional[Dict[str, Any]]
    comparison_result: Optional[Dict[str, Any]]
    relaxation_options: List[Dict[str, Any]]
    
    # Decisions & Grounded Output
    needs_clarification: bool
    clarification_question: Optional[str]
    final_response_text: Optional[str]
    status: str
    events: List[Dict[str, Any]]
    error: Optional[str]
