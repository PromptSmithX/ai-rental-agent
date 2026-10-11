from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from app.domain.models import Room, Campus
from app.schemas.search import SearchFilters
from app.services.distance import calculate_air_distance_km


class RoomRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, room_id: str) -> Optional[Room]:
        return (
            self.db.query(Room)
            .options(selectinload(Room.images))
            .filter(Room.id == room_id)
            .first()
        )

    def list_all(self) -> List[Room]:
        return (
            self.db.query(Room)
            .options(selectinload(Room.images))
            .order_by(Room.id)
            .all()
        )

    def search_rooms(
        self,
        filters: SearchFilters,
        campus: Optional[Campus] = None,
    ) -> List[Room]:
        """Apply strict domain filtering rules and return matching Room records.
        
        Strict filtering rules per contract:
        - price <= maxPriceVnd
        - area >= minAreaM2 (missing area excluded if minAreaM2 specified)
        - requiredAmenities: room must have all specified amenities
        - petAllowed: strict boolean match (null in room excluded if filter set)
        - maxDistanceKm: distance <= maxDistanceKm (null distance / missing coords excluded)
        """
        query = self.db.query(Room).options(selectinload(Room.images))

        # 1. SQL-level filter: Max Price
        if filters.max_price_vnd is not None:
            query = query.filter(Room.price_monthly_vnd <= filters.max_price_vnd)

        # 2. SQL-level filter: Min Area
        if filters.min_area_m2 is not None:
            query = query.filter(
                Room.area_m2.isnot(None),
                Room.area_m2 >= filters.min_area_m2,
            )

        # 3. SQL-level filter: Pet Allowed
        if filters.pet_allowed is not None:
            query = query.filter(Room.pet_allowed == filters.pet_allowed)

        candidates = query.all()
        matched: List[Room] = []

        # 4. In-memory / engine verification: Amenities & Distance
        for room in candidates:
            # Check required amenities
            if filters.required_amenities and len(filters.required_amenities) > 0:
                room_amenities = room.amenities or []
                # Support both Enum values and string values
                amenities_str = [
                    a.value if hasattr(a, "value") else str(a)
                    for a in room_amenities
                ]
                has_all = all(
                    (req.value if hasattr(req, "value") else str(req)) in amenities_str
                    for req in filters.required_amenities
                )
                if not has_all:
                    continue

            # Check distance filter
            if filters.max_distance_km is not None:
                if campus is None or room.latitude is None or room.longitude is None:
                    # Missing coordinates cannot satisfy distance filter
                    continue
                dist = calculate_air_distance_km(
                    campus.latitude,
                    campus.longitude,
                    room.latitude,
                    room.longitude,
                )
                if dist is None or dist > filters.max_distance_km:
                    continue

            matched.append(room)

        return matched
