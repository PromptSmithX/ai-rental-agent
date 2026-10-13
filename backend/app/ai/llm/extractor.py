import json
from typing import List, Optional
from app.schemas.search import SearchFilters
from app.ai.schemas.intent import UserIntent, ExtractedRequest
from app.ai.prompts.extraction_prompt import EXTRACTION_SYSTEM_PROMPT
from app.ai.llm.client import get_openai_client, execute_with_retries
from app.ai.llm.normalizer import normalize_filter_operations
from app.ai.config import ai_settings


class OpenAIExtractor:
    """Production structured extractor using OpenAI Structured Outputs (Pydantic schema)."""

    def __init__(self, model: Optional[str] = None):
        self.model = model or ai_settings.OPENAI_MODEL

    def extract(
        self,
        user_message: str,
        current_filters: Optional[SearchFilters] = None,
        last_result_room_ids: Optional[List[str]] = None,
    ) -> ExtractedRequest:
        client = get_openai_client()

        # Build user context prompt
        context_payload = {
            "user_message": user_message,
            "current_filters": current_filters.model_dump() if current_filters else None,
            "last_search_room_ids": last_result_room_ids or [],
        }

        user_content = (
            f"Hãy phân tích câu nói của người dùng sau đây:\n\n"
            f"{json.dumps(context_payload, ensure_ascii=False, indent=2)}"
        )

        def _call_api():
            completion = client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                response_format=ExtractedRequest,
                temperature=0.0,
            )
            return completion.choices[0].message.parsed

        parsed: ExtractedRequest = execute_with_retries(_call_api)

        # Post-process operations with deterministic normalizer for numeric VND and aerial km
        if parsed and parsed.operations:
            parsed.operations = normalize_filter_operations(parsed.operations)

        if parsed:
            parsed.raw_user_message = user_message

        return parsed
