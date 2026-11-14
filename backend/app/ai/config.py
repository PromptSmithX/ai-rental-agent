from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class AIAgentSettings(BaseSettings):
    """Configuration for AI Rental Copilot Agent."""
    
    # OpenAI Settings (used in Phase C+)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_TIMEOUT_SECONDS: float = 15.0
    OPENAI_MAX_RETRIES: int = 2
    
    # Agent Runtime Limits
    AGENT_MAX_TOOL_CALLS: int = 5
    AGENT_MAX_RUNTIME_SECONDS: float = 30.0
    
    # Repository Mode: 'mock_hybrid' (Hanoi + HCM), 'mock_hanoi', or 'postgres'
    AGENT_REPOSITORY_MODE: str = "mock_hybrid"
    
    # LLM Execution Mode: 'mock' (Phase B default) or 'openai' (Phase C)
    AGENT_LLM_MODE: str = "mock"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def IS_SIMULATION(self) -> bool:
        """True only when the agent is running on the mock LLM (no real OpenAI calls)."""
        return self.AGENT_LLM_MODE != "openai"


ai_settings = AIAgentSettings()
