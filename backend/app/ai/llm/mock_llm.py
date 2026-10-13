import re
from typing import Any, Dict, List, Optional
from app.domain.enums import Amenity, SortByOption
from app.schemas.search import SearchFilters, SearchResult
from app.schemas.room import RoomView
from app.ai.schemas.intent import UserIntent, ExtractedRequest
from app.ai.schemas.filters import FilterOpType, FilterOperation
from app.ai.tools.compare_tool import RoomComparisonResult
from app.ai.tools.relaxation_tool import RelaxationSuggestion


class MockExtractor:
    """Deterministic extractor simulating LLM Call 1 for Phase B & offline testing."""

    @staticmethod
    def extract(
        user_message: str,
        current_filters: Optional[SearchFilters] = None,
        last_result_room_ids: Optional[List[str]] = None,
    ) -> ExtractedRequest:
        norm = user_message.lower().strip()
        ops: List[FilterOperation] = []
        target_room_ids: List[str] = []
        campus_query: Optional[str] = None
        ref_idx: Optional[int] = None

        curr_campus = current_filters.campus_id if current_filters else None

        # S06: "Tìm phòng gần trường mình" (Missing/ambiguous campus)
        if (
            "gần trường mình" in norm
            or "gần trường tôi" in norm
            or (norm.startswith("tìm phòng") and not any(
                k in norm for k in ["bách khoa", "hà nội", "lý thường kiệt", "dĩ an", "vnu", "neu", "quận", "cầu giấy"]
            ) and not curr_campus)
        ):
            return ExtractedRequest(
                intent=UserIntent.CLARIFY,
                needs_clarification=True,
                clarification_reason="Bạn muốn tìm phòng gần trường nào? Hệ thống hiện hỗ trợ ĐH Bách Khoa Hà Nội, ĐHQG Hà Nội, NEU và ĐH Bách Khoa TP.HCM.",
                raw_user_message=user_message,
            )

        # S09: "So sánh phòng 01 và 02" or "So sánh hai phòng đầu tiên"
        if "so sánh" in norm or "compare" in norm:
            if "đầu tiên" in norm or "2 phòng đầu" in norm:
                return ExtractedRequest(
                    intent=UserIntent.COMPARE,
                    room_reference_index=0,  # signal to take first 2 rooms from last results
                    raw_user_message=user_message,
                )
            
            # Check for IDs in utterance
            found_ids = []
            for candidate in ["demo-room-01", "demo-room-02", "demo-room-03", "hanoi-room-01", "hanoi-room-02", "hanoi-room-03"]:
                if candidate in norm:
                    found_ids.append(candidate)
            
            # Match shorthand numbers: "01 và 02" or "1 và 2"
            if not found_ids:
                if ("01" in norm or "phòng 1" in norm) and ("02" in norm or "phòng 2" in norm):
                    prefix = "hanoi-room" if (curr_campus and "hanoi" in curr_campus) else "demo-room"
                    found_ids = [f"{prefix}-01", f"{prefix}-02"]

            return ExtractedRequest(
                intent=UserIntent.COMPARE,
                target_room_ids=found_ids,
                raw_user_message=user_message,
            )

        # S08: Room detail "Cho mình xem phòng demo-room-01" or "phòng đầu tiên"
        if "xem phòng" in norm or "chi tiết" in norm:
            if "đầu tiên" in norm:
                return ExtractedRequest(
                    intent=UserIntent.ROOM_DETAIL,
                    room_reference_index=0,
                    raw_user_message=user_message,
                )
            for candidate in ["demo-room-01", "demo-room-02", "demo-room-03", "hanoi-room-01", "hanoi-room-02"]:
                if candidate in norm:
                    target_room_ids.append(candidate)
            if not target_room_ids:
                if "01" in norm or "phòng 1" in norm:
                    prefix = "hanoi-room" if (curr_campus and "hanoi" in curr_campus) else "demo-room"
                    target_room_ids.append(f"{prefix}-01")

            return ExtractedRequest(
                intent=UserIntent.ROOM_DETAIL,
                target_room_ids=target_room_ids,
                raw_user_message=user_message,
            )

        # S10: "Phòng nào gần nhất?"
        if "gần nhất" in norm or "khoảng cách gần" in norm:
            ops.append(FilterOperation(op=FilterOpType.SET, field="sort_by", value=SortByOption.DISTANCE_ASC))
            return ExtractedRequest(
                intent=UserIntent.REFINE,
                operations=ops,
                raw_user_message=user_message,
            )

        # S11: "Có phòng nào hết hạn không?"
        if "hết hạn" in norm or "còn phòng" in norm:
            return ExtractedRequest(
                intent=UserIntent.GENERAL_QUESTION,
                raw_user_message=user_message,
            )

        # S07: "Dưới 1 triệu, có điều hòa, nuôi mèo, dưới 500m" (zero result test)
        if ("dưới 1 triệu" in norm or "1tr" in norm) and ("điều hòa" in norm or "máy lạnh" in norm) and ("nuôi mèo" in norm or "thú cưng" in norm):
            c_target = curr_campus or "hust-hanoi"
            ops.append(FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value=1000000))
            ops.append(FilterOperation(op=FilterOpType.SET, field="max_distance_km", value=0.5))
            ops.append(FilterOperation(op=FilterOpType.ADD, field="required_amenities", value="air_conditioner"))
            ops.append(FilterOperation(op=FilterOpType.SET, field="pet_allowed", value=True))
            ops.append(FilterOperation(op=FilterOpType.SET, field="campus_id", value=c_target))
            return ExtractedRequest(
                intent=UserIntent.SEARCH,
                operations=ops,
                campus_query=c_target,
                raw_user_message=user_message,
            )

        # S05: "Bỏ máy lạnh đi"
        if "bỏ máy lạnh" in norm or "không cần máy lạnh" in norm or "bỏ điều hòa" in norm:
            ops.append(FilterOperation(op=FilterOpType.REMOVE, field="required_amenities", value="air_conditioner"))
            return ExtractedRequest(
                intent=UserIntent.REFINE,
                operations=ops,
                raw_user_message=user_message,
            )

        # S04: "Tăng ngân sách lên 3,5 triệu"
        if "tăng ngân sách" in norm or "3,5 triệu" in norm or "3.5 triệu" in norm or "3.5tr" in norm or "3tr5" in norm:
            ops.append(FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value=3500000))
            return ExtractedRequest(
                intent=UserIntent.REFINE,
                operations=ops,
                raw_user_message=user_message,
            )

        # S03: "Cho nuôi mèo"
        if "nuôi mèo" in norm or "nuôi chó" in norm or "thú cưng" in norm:
            ops.append(FilterOperation(op=FilterOpType.SET, field="pet_allowed", value=True))
            return ExtractedRequest(
                intent=UserIntent.REFINE,
                operations=ops,
                raw_user_message=user_message,
            )

        # S02: "Có máy lạnh nữa"
        if "có máy lạnh" in norm or "thêm máy lạnh" in norm or "thêm điều hòa" in norm:
            ops.append(FilterOperation(op=FilterOpType.ADD, field="required_amenities", value="air_conditioner"))
            return ExtractedRequest(
                intent=UserIntent.REFINE,
                operations=ops,
                raw_user_message=user_message,
            )

        # General Search Extraction (e.g. S01, Hanoi search, etc.)
        # Campus extraction
        if "bách khoa hà nội" in norm or "bkhn" in norm or "hust" in norm:
            campus_query = "hust-hanoi"
            ops.append(FilterOperation(op=FilterOpType.SET, field="campus_id", value="hust-hanoi"))
        elif "quốc gia hà nội" in norm or "vnu" in norm:
            campus_query = "vnu-hanoi"
            ops.append(FilterOperation(op=FilterOpType.SET, field="campus_id", value="vnu-hanoi"))
        elif "kinh tế quốc dân" in norm or "neu" in norm:
            campus_query = "neu-hanoi"
            ops.append(FilterOperation(op=FilterOpType.SET, field="campus_id", value="neu-hanoi"))
        elif "lý thường kiệt" in norm or "ltk" in norm or ("bách khoa" in norm and "quận 10" in norm):
            campus_query = "hcmut-ltk"
            ops.append(FilterOperation(op=FilterOpType.SET, field="campus_id", value="hcmut-ltk"))
        elif "dĩ an" in norm:
            campus_query = "hcmut-da"
            ops.append(FilterOperation(op=FilterOpType.SET, field="campus_id", value="hcmut-da"))
        elif "bách khoa" in norm:
            # Check if default or ambiguous
            campus_query = "bách khoa"

        # Price extraction
        if "dưới 3 triệu" in norm or "3tr" in norm or "dưới 3tr" in norm or "3 triệu" in norm:
            ops.append(FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value=3000000))
        elif "dưới 2 triệu" in norm or "2tr" in norm:
            ops.append(FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value=2000000))
        elif "dưới 2,5 triệu" in norm or "2tr5" in norm:
            ops.append(FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value=2500000))

        # Distance extraction
        if "2 km" in norm or "2km" in norm:
            ops.append(FilterOperation(op=FilterOpType.SET, field="max_distance_km", value=2.0))
        elif "1 km" in norm or "1km" in norm:
            ops.append(FilterOperation(op=FilterOpType.SET, field="max_distance_km", value=1.0))
        elif "500m" in norm:
            ops.append(FilterOperation(op=FilterOpType.SET, field="max_distance_km", value=0.5))

        # Amenity extraction
        if "máy lạnh" in norm or "điều hòa" in norm:
            ops.append(FilterOperation(op=FilterOpType.ADD, field="required_amenities", value="air_conditioner"))

        if ops:
            intent = UserIntent.SEARCH if (campus_query or not current_filters or not current_filters.campus_id) else UserIntent.REFINE
            return ExtractedRequest(
                intent=intent,
                operations=ops,
                campus_query=campus_query,
                raw_user_message=user_message,
            )

        # S12: Unrelated prompt
        return ExtractedRequest(
            intent=UserIntent.UNSUPPORTED,
            needs_clarification=True,
            clarification_reason="Mình là AI Copilot hỗ trợ tìm phòng trọ sinh viên. Bạn có thể tìm phòng theo mẫu: 'Tìm phòng dưới 3 triệu quanh ĐH Bách Khoa Hà Nội trong 2km, có điều hòa'.",
            raw_user_message=user_message,
        )


class MockResponseGenerator:
    """Grounded Vietnamese response generator for Phase B & offline testing."""

    @staticmethod
    def generate(
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

        if intent == UserIntent.GENERAL_QUESTION:
            return (
                "Toàn bộ danh sách trong giai đoạn thử nghiệm này là dữ liệu mô phỏng (Demo). "
                "Trạng thái tin đăng là 'Chưa rõ' (Unknown) và chưa được xác minh thời gian thực. "
                "Hệ thống không cam kết phòng còn trống."
            )

        if intent == UserIntent.ROOM_DETAIL:
            if detail_result:
                tr_str = f"{detail_result.price_monthly_vnd / 1_000_000:.1f}tr"
                return (
                    f"Đây là thông tin phòng {detail_result.id}: {detail_result.title} "
                    f"({tr_str}/tháng, {detail_result.area_m2 or 'chưa rõ '}m²). "
                    f"Địa chỉ: {detail_result.address_label}."
                )
            return "Rất tiếc, mình không tìm thấy thông tin chi tiết cho mã phòng này trong hệ thống."

        if intent == UserIntent.COMPARE:
            if comparison_result and comparison_result.summary:
                return comparison_result.summary
            return "Không đủ dữ liệu để so sánh các phòng được yêu cầu."

        if search_result:
            if search_result.total_matched == 0:
                relax_msg = ""
                if relaxation_options and len(relaxation_options) > 0:
                    options_str = "; ".join([opt.description for opt in relaxation_options[:2]])
                    relax_msg = f" Gợi ý: bạn có thể {options_str}."
                return (
                    "Chưa có phòng mẫu nào đáp ứng toàn bộ tiêu chí của bạn."
                    f"{relax_msg}"
                )

            top_hits = search_result.hits[:3]
            top_ids = ", ".join([h.room_id for h in top_hits])
            tr_budget = (
                f" ≤ {filters.max_price_vnd / 1_000_000:.1f}tr"
                if filters.max_price_vnd else ""
            )
            dist_txt = (
                f" trong bán kính {filters.max_distance_km} km"
                if filters.max_distance_km else ""
            )
            return (
                f"Mình tìm thấy {search_result.total_matched} phòng phù hợp với yêu cầu của bạn{tr_budget}{dist_txt}. "
                f"Các phòng phù hợp nhất: {top_ids}. Bạn có thể xem trên bản đồ hoặc chọn từng thẻ phòng để xem chi tiết."
            )

        return "Đã cập nhật tiêu chí tìm kiếm của bạn."
