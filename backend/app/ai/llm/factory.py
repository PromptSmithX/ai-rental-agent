import os
from typing import Optional
from app.ai.config import ai_settings
from app.ai.llm.mock_llm import MockExtractor, MockResponseGenerator
from app.ai.llm.extractor import OpenAIExtractor
from app.ai.llm.response_generator import OpenAIResponseGenerator

_custom_extractor = None
_custom_generator = None


def get_extractor():
    """Retrieve active request extractor according to configuration and credentials."""
    global _custom_extractor
    if _custom_extractor is not None:
        return _custom_extractor

    has_key = bool(ai_settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY"))
    if ai_settings.AGENT_LLM_MODE == "openai" and has_key:
        return OpenAIExtractor()
    return MockExtractor()


def get_response_generator():
    """Retrieve active response generator according to configuration and credentials."""
    global _custom_generator
    if _custom_generator is not None:
        return _custom_generator

    has_key = bool(ai_settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY"))
    if ai_settings.AGENT_LLM_MODE == "openai" and has_key:
        return OpenAIResponseGenerator()
    return MockResponseGenerator()


def set_extractor(extractor):
    """Override extractor for testing."""
    global _custom_extractor
    _custom_extractor = extractor


def set_response_generator(generator):
    """Override response generator for testing."""
    global _custom_generator
    _custom_generator = generator
