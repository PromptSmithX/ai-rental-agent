from typing import Any, Dict, List, Optional
from pydantic import Field
from app.schemas.base import CamelModel
from app.schemas.search import SearchFilters, SearchResult
from app.ai.schemas.events import AgentEventSchema


class AgentChatRequest(CamelModel):
    """Request payload for /api/v1/agent/chat."""
    thread_id: str
    message: str
    client_request_id: Optional[str] = None
    current_filters: Optional[SearchFilters] = None


class ChatMessageDTO(CamelModel):
    id: str
    thread_id: str
    role: str
    content: str
    created_at: str
    referenced_room_ids: List[str] = Field(default_factory=list)


class AgentChatResponse(CamelModel):
    """Full Agent response payload matching frontend AgentReply contract."""
    run_id: str
    thread_id: str
    status: str  # idle, extracting, searching, ranking, completed, needs_clarification, failed
    message: ChatMessageDTO
    filter_patch: Dict[str, Any] = Field(default_factory=dict)
    result: Optional[SearchResult] = None
    events: List[AgentEventSchema] = Field(default_factory=list)
    clarification_question: Optional[str] = None
    is_simulation: bool = True
