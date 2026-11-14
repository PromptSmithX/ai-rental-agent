from enum import Enum
from typing import Any, Dict, Optional
from pydantic import Field
from app.schemas.base import CamelModel


class AgentEventType(str, Enum):
    """Event types aligned with frontend AgentEvent contract."""
    RUN_STARTED = "run_started"
    PREFERENCES_EXTRACTED = "preferences_extracted"
    CAMPUS_RESOLVED = "campus_resolved"
    ROOMS_SEARCHED = "rooms_searched"
    DISTANCE_FILTERED = "distance_filtered"
    ROOMS_RANKED = "rooms_ranked"
    RESPONSE_READY = "response_ready"
    CLARIFICATION_REQUIRED = "clarification_required"
    RUN_FAILED = "run_failed"
    RUN_COMPLETED = "run_completed"
    TOOL_STARTED = "tool_started"
    TOOL_COMPLETED = "tool_completed"
    TOOL_FAILED = "tool_failed"


class EventStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"


class AgentEventSchema(CamelModel):
    """Application event schema emitted to frontend timeline / trace."""
    id: str
    run_id: str
    type: AgentEventType
    status: EventStatus = EventStatus.SUCCESS
    label: str
    timestamp: str
    duration_ms: Optional[int] = None
    is_simulation: bool = True
    details: Dict[str, Any] = Field(default_factory=dict)
