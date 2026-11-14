import os
import time
from typing import Optional
from openai import OpenAI, APIError, APITimeoutError, AuthenticationError, RateLimitError
from app.ai.config import ai_settings


class OpenAIConfigurationError(Exception):
    """Raised when OpenAI API key or configuration is invalid or missing."""
    pass


class OpenAITimeoutException(Exception):
    """Raised when OpenAI request times out."""
    pass


class OpenAIProviderException(Exception):
    """Raised when an unrecoverable OpenAI provider error occurs."""
    pass


_openai_client: Optional[OpenAI] = None


def get_openai_client() -> OpenAI:
    """Retrieve or initialize the singleton OpenAI client.
    
    Reads OPENAI_API_KEY from environment or ai_settings.
    Never exposes or logs the API key.
    """
    global _openai_client
    if _openai_client is not None:
        return _openai_client

    api_key = ai_settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise OpenAIConfigurationError(
            "OPENAI_API_KEY is not configured in environment or settings. "
            "Please configure OPENAI_API_KEY to enable real LLM features."
        )

    _openai_client = OpenAI(
        api_key=api_key,
        timeout=ai_settings.OPENAI_TIMEOUT_SECONDS,
        max_retries=0,  # We manage bounded retries with custom error mapping
    )
    return _openai_client


def execute_with_retries(func, max_retries: Optional[int] = None, initial_backoff: float = 1.0):
    """Execute callable with bounded retries and exponential backoff on transient errors."""
    retries = max_retries if max_retries is not None else ai_settings.OPENAI_MAX_RETRIES
    backoff = initial_backoff

    for attempt in range(retries + 1):
        try:
            return func()
        except AuthenticationError as e:
            # Fatal error: do not retry
            raise OpenAIConfigurationError(f"OpenAI authentication failed: {str(e)}") from e
        except APITimeoutError as e:
            if attempt == retries:
                raise OpenAITimeoutException(f"OpenAI request timed out after {retries + 1} attempts.") from e
            time.sleep(backoff)
            backoff *= 2.0
        except RateLimitError as e:
            if attempt == retries:
                raise OpenAIProviderException(f"OpenAI rate limit exceeded: {str(e)}") from e
            time.sleep(backoff * 1.5)
            backoff *= 2.0
        except APIError as e:
            if attempt == retries:
                raise OpenAIProviderException(f"OpenAI provider error ({e.code}): {str(e)}") from e
            time.sleep(backoff)
            backoff *= 2.0
        except Exception as e:
            raise OpenAIProviderException(f"Unexpected error calling OpenAI: {str(e)}") from e
