from enum import Enum
from typing import Any, Optional
from app.schemas.base import CamelModel


class FilterOpType(str, Enum):
    """Supported filter mutation operations."""
    SET = "set"
    REMOVE = "remove"
    ADD = "add"
    CLEAR = "clear"
    RESET_ALL = "reset_all"


class FilterOperation(CamelModel):
    """Explicit filter operation extracted from user utterance."""
    op: FilterOpType
    field: str
    value: Optional[Any] = None
