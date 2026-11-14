import os
from typing import Optional
from app.ai.config import ai_settings
from app.ai.llm.client import OpenAIConfigurationError
from app.ai.llm.mock_llm import MockExtractor, MockResponseGenerator
from app.ai.llm.extractor import OpenAIExtractor
from app.ai.llm.response_generator import OpenAIResponseGenerator

_custom_extractor = None
_custom_generator = None


def get_extractor():
    """Retrieve active request extractor according to configuration and credentials.

    Only `AGENT_LLM_MODE == "mock"` (test/CI) returns the mock extractor. If the
    configured mode is "openai" but no API key is present, this raises instead of
    silently degrading to mock, so misconfiguration is never mistaken for a real reply.
    """
    global _custom_extractor
    if _custom_extractor is not None:
        return _custom_extractor

    if ai_settings.AGENT_LLM_MODE == "mock":
        return MockExtractor()

    has_key = bool(ai_settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY"))
    if not has_key:
        raise OpenAIConfigurationError(
            "AGENT_LLM_MODE is 'openai' but OPENAI_API_KEY is not configured."
        )
    return OpenAIExtractor()


def get_response_generator():
    """Retrieve active response generator according to configuration and credentials.

    Same mock-only-in-mock-mode rule as `get_extractor`.
    """
    global _custom_generator
    if _custom_generator is not None:
        return _custom_generator

    if ai_settings.AGENT_LLM_MODE == "mock":
        return MockResponseGenerator()

    has_key = bool(ai_settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY"))
    if not has_key:
        raise OpenAIConfigurationError(
            "AGENT_LLM_MODE is 'openai' but OPENAI_API_KEY is not configured."
        )
    return OpenAIResponseGenerator()


def set_extractor(extractor):
    """Override extractor for testing."""
    global _custom_extractor
    _custom_extractor = extractor


def set_response_generator(generator):
    """Override response generator for testing."""
    global _custom_generator
    _custom_generator = generator


def is_simulation_mode() -> bool:
    """True when the active extractor/generator is a mock, not the real OpenAI client.

    Checks the actual overridden instance (set via `set_extractor`/`set_response_generator`)
    before falling back to `AGENT_LLM_MODE`, so tests that force a mock LLM for determinism
    report themselves as simulated regardless of the ambient `.env` configuration.
    """
    if isinstance(_custom_extractor, MockExtractor) or isinstance(_custom_generator, MockResponseGenerator):
        return True
    if _custom_extractor is not None or _custom_generator is not None:
        return False
    return ai_settings.AGENT_LLM_MODE == "mock"
