from datetime import datetime
from typing import List, Optional
from pydantic import Field
from app.domain.enums import Amenity, SortByOption
from app.schemas.base import CamelModel


class SearchFilters(CamelModel):
    campus_id: Optional[str] = None
    max_price_vnd: Optional[int] = None
    max_distance_km: Optional[float] = None
    min_area_m2: Optional[float] = None
    required_amenities: List[Amenity] = Field(default_factory=list)
    pet_allowed: Optional[bool] = None
    sort_by: SortByOption = SortByOption.RECOMMENDED


class RoomSearchHit(CamelModel):
    room_id: str
    distance_km: Optional[float] = None
    ranking_score: Optional[float] = None
    match_reasons: List[str] = Field(default_factory=list)
    caveats: List[str] = Field(default_factory=list)


class SearchResult(CamelModel):
    applied_filters: SearchFilters
    hits: List[RoomSearchHit]
    total_matched: int
    searched_at: datetime
    dataset_mode: str = "demo"
