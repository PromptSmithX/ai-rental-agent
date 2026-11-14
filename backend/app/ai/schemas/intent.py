from enum import Enum
from typing import List, Optional
from pydantic import Field
from app.schemas.base import CamelModel
from app.ai.schemas.filters import FilterOperation


class UserIntent(str, Enum):
    """Categorized intent of user utterance."""
    SEARCH = "search"
    REFINE = "refine"
    ROOM_DETAIL = "room_detail"
    COMPARE = "compare"
    CLARIFY = "clarify"
    GENERAL_QUESTION = "general_question"
    UNSUPPORTED = "unsupported"


class ExtractedRequest(CamelModel):
    """Structured request extracted by LLM Call 1 or MockExtractor."""
    intent: UserIntent = UserIntent.SEARCH
    operations: List[FilterOperation] = Field(default_factory=list)
    campus_query: Optional[str] = None
    target_room_ids: List[str] = Field(default_factory=list)
    room_reference_index: Optional[int] = None
    needs_clarification: bool = False
    clarification_reason: Optional[str] = None
    raw_user_message: Optional[str] = None
