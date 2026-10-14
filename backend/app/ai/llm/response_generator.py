import json
from typing import List, Optional
from app.schemas.search import SearchFilters, SearchResult
from app.schemas.room import RoomView
from app.ai.schemas.intent import UserIntent
from app.ai.prompts.response_prompt import RESPONSE_SYSTEM_PROMPT
from app.ai.tools.compare_tool import RoomComparisonResult
from app.ai.tools.relaxation_tool import RelaxationSuggestion
from app.ai.llm.client import get_openai_client, execute_with_retries
from app.ai.config import ai_settings


class OpenAIResponseGenerator:
    """Production grounded response generator using OpenAI Chat Completions with strict factual context."""

    def __init__(self, model: Optional[str] = None):
        self.model = model or ai_settings.OPENAI_MODEL

    def generate(
        self,
        user_message: str,
        intent: UserIntent,
        filters: SearchFilters,
        search_result: Optional[SearchResult] = None,
        detail_result: Optional[RoomView] = None,
        comparison_result: Optional[RoomComparisonResult] = None,
        relaxation_options: Optional[List[RelaxationSuggestion]] = None,
        clarification_question: Optional[str] = None,
    ) -> str:
        if clarification_question:
            return clarification_question

        client = get_openai_client()

        # Build factual context dictionary
        facts_payload = {
            "intent": intent.value,
            "user_request": user_message,
            "validated_filters": filters.model_dump(),
        }

        if search_result:
            facts_payload["search_summary"] = {
                "total_matched": search_result.total_matched,
                "top_hits": [
                    {
                        "room_id": hit.room_id,
                        "distance_km": hit.distance_km,
                        "match_reasons": hit.match_reasons,
                        "caveats": hit.caveats,
                    }
                    for hit in search_result.hits[:4]
                ],
            }

        if detail_result:
            facts_payload["selected_room_detail"] = {
                "id": detail_result.id,
                "title": detail_result.title,
                "price_monthly_vnd": detail_result.price_monthly_vnd,
                "area_m2": detail_result.area_m2,
                "address_label": detail_result.address_label,
                "amenities": [a.value if hasattr(a, "value") else str(a) for a in detail_result.amenities],
                "pet_allowed": detail_result.pet_allowed,
                "utilities_monthly_estimate_vnd": detail_result.utilities_monthly_estimate_vnd,
                "location_accuracy": detail_result.location_accuracy.value,
            }

        if comparison_result:
            facts_payload["comparison_matrix"] = comparison_result.comparison_table
            facts_payload["comparison_summary"] = comparison_result.summary

        if relaxation_options:
            facts_payload["relaxation_suggestions"] = [
                {"action": r.action_type, "description": r.description, "count": r.matched_count}
                for r in relaxation_options
            ]

        user_content = (
            f"Dưới đây là dữ liệu xác thực từ hệ thống. Hãy tổng hợp câu trả lời tiếng Việt chính xác và trung thực:\n\n"
            f"{json.dumps(facts_payload, ensure_ascii=False, indent=2)}"
        )

        def _call_api():
            completion = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": RESPONSE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.2,
                max_tokens=600,
            )
            return completion.choices[0].message.content

        response_text = execute_with_retries(_call_api)
        return response_text.strip() if response_text else "Không nhận được phản hồi từ hệ thống."
