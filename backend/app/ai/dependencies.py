from typing import Optional
from app.ai.config import ai_settings
from app.ai.repositories.base import BaseAgentRoomRepository
from app.ai.repositories.mock_hanoi_repo import MockHanoiRepository

_repository_instance: Optional[BaseAgentRoomRepository] = None


def get_agent_repository(mode: Optional[str] = None) -> BaseAgentRoomRepository:
    """Retrieve or initialize the active BaseAgentRoomRepository."""
    global _repository_instance

    # If no explicit mode requested and instance was explicitly set, reuse it
    if mode is None and _repository_instance is not None:
        return _repository_instance

    chosen_mode = mode or ai_settings.AGENT_REPOSITORY_MODE

    # If instance already exists and matches mode, reuse it
    if _repository_instance is not None and getattr(_repository_instance, "mode", None) == chosen_mode:
        return _repository_instance

    if chosen_mode in ("mock_hanoi", "mock_hybrid"):
        _repository_instance = MockHanoiRepository(mode=chosen_mode)
    elif chosen_mode in ("postgres", "database", "db"):
        try:
            from app.database import SessionLocal
            from app.ai.repositories.db_repository import DatabaseAgentRoomRepository
            db = SessionLocal()
            _repository_instance = DatabaseAgentRoomRepository(db, mode=chosen_mode)
        except Exception:
            # Fallback to mock_hybrid if database is not reachable
            _repository_instance = MockHanoiRepository(mode="mock_hybrid")
    else:
        # Default to hybrid mock for safety when DB not running
        _repository_instance = MockHanoiRepository(mode="mock_hybrid")

    return _repository_instance


def set_agent_repository(repo: BaseAgentRoomRepository) -> None:
    """Explicitly override repository instance (useful for unit tests)."""
    global _repository_instance
    _repository_instance = repo
