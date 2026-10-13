from copy import deepcopy
from typing import List, Optional
from app.schemas.base import CamelModel
from app.schemas.search import SearchFilters
from app.ai.repositories.base import BaseAgentRoomRepository


class RelaxationSuggestion(CamelModel):
    action_type: str  # 'increase_budget', 'expand_radius', 'remove_amenity'
    description: str
    proposed_filters: SearchFilters
    matched_count: int


def suggest_filter_relaxations(
    current_filters: SearchFilters,
    repo: BaseAgentRoomRepository,
) -> List[RelaxationSuggestion]:
    """Generate candidate filter relaxations backed by real database query counts.
    
    Never fabricates counts. Never mutates current_filters.
    """
    suggestions: List[RelaxationSuggestion] = []

    # 1. Proposal A: Increase budget (search progressively higher tiers)
    if current_filters.max_price_vnd is not None:
        for step_mult in [1, 2, 3, 4, 6]:
            step = 500_000 * step_mult
            new_price = current_filters.max_price_vnd + step
            relaxed_budget = deepcopy(current_filters)
            relaxed_budget.max_price_vnd = new_price
            
            real_result = repo.search_rooms(relaxed_budget)
            if real_result.total_matched > 0:
                tr_str = f"{new_price / 1_000_000:.1f}tr".replace(".0tr", "tr")
                suggestions.append(
                    RelaxationSuggestion(
                        action_type="increase_budget",
                        description=f"Tăng ngân sách lên {tr_str} ({real_result.total_matched} phòng phù hợp)",
                        proposed_filters=relaxed_budget,
                        matched_count=real_result.total_matched,
                    )
                )
                break

    # 2. Proposal B: Expand radius if max_distance_km is set
    if current_filters.max_distance_km is not None and current_filters.campus_id is not None:
        for dist_step in [1.5, 3.0, 5.0]:
            relaxed_dist = deepcopy(current_filters)
            new_dist = current_filters.max_distance_km + dist_step
            relaxed_dist.max_distance_km = new_dist
            
            real_result = repo.search_rooms(relaxed_dist)
            if real_result.total_matched > 0:
                suggestions.append(
                    RelaxationSuggestion(
                        action_type="expand_radius",
                        description=f"Mở rộng bán kính lên {new_dist:.1f} km ({real_result.total_matched} phòng phù hợp)",
                        proposed_filters=relaxed_dist,
                        matched_count=real_result.total_matched,
                    )
                )
                break

    # 3. Proposal C: Remove amenity if multiple amenities are required
    if current_filters.required_amenities and len(current_filters.required_amenities) > 0:
        relaxed_amenities = deepcopy(current_filters)
        relaxed_amenities.required_amenities = relaxed_amenities.required_amenities[:-1]
        
        real_result = repo.search_rooms(relaxed_amenities)
        if real_result.total_matched > 0:
            suggestions.append(
                RelaxationSuggestion(
                    action_type="remove_amenity",
                    description=f"Bớt 1 tiện ích yêu cầu ({real_result.total_matched} phòng phù hợp)",
                    proposed_filters=relaxed_amenities,
                    matched_count=real_result.total_matched,
                )
            )

    # 4. Proposal D: Relax pet restriction if pet_allowed is True
    if current_filters.pet_allowed is True:
        relaxed_pet = deepcopy(current_filters)
        relaxed_pet.pet_allowed = None
        real_result = repo.search_rooms(relaxed_pet)
        if real_result.total_matched > 0:
            suggestions.append(
                RelaxationSuggestion(
                    action_type="relax_pet_policy",
                    description=f"Bỏ tiêu chí cho phép nuôi thú cưng ({real_result.total_matched} phòng phù hợp)",
                    proposed_filters=relaxed_pet,
                    matched_count=real_result.total_matched,
                )
            )

    # 5. Proposal E: Relax min area if min_area_m2 is set
    if current_filters.min_area_m2 is not None and current_filters.min_area_m2 > 15:
        relaxed_area = deepcopy(current_filters)
        relaxed_area.min_area_m2 = max(15.0, current_filters.min_area_m2 - 5.0)
        real_result = repo.search_rooms(relaxed_area)
        if real_result.total_matched > 0:
            suggestions.append(
                RelaxationSuggestion(
                    action_type="lower_min_area",
                    description=f"Giảm diện tích tối thiểu xuống {relaxed_area.min_area_m2:.0f}m² ({real_result.total_matched} phòng phù hợp)",
                    proposed_filters=relaxed_area,
                    matched_count=real_result.total_matched,
                )
            )

    # 6. Proposal F: Relax both budget and distance if single dimension relaxation yields 0
    if not suggestions and current_filters.max_price_vnd is not None:
        for p_mult in [2, 3, 4]:
            relaxed_combo = deepcopy(current_filters)
            relaxed_combo.max_price_vnd = current_filters.max_price_vnd + (500_000 * p_mult)
            if relaxed_combo.max_distance_km is not None:
                relaxed_combo.max_distance_km = relaxed_combo.max_distance_km + 2.0
            real_result = repo.search_rooms(relaxed_combo)
            if real_result.total_matched > 0:
                tr_str = f"{relaxed_combo.max_price_vnd / 1_000_000:.1f}tr".replace(".0tr", "tr")
                suggestions.append(
                    RelaxationSuggestion(
                        action_type="increase_budget",
                        description=f"Tăng ngân sách lên {tr_str} và mở rộng bán kính ({real_result.total_matched} phòng phù hợp)",
                        proposed_filters=relaxed_combo,
                        matched_count=real_result.total_matched,
                    )
                )
                break

    return suggestions
