from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.campus_repository import CampusRepository
from app.domain.models import Campus
from app.schemas.campus import CampusResponse


class CampusService:
    def __init__(self, db: Session):
        self.repo = CampusRepository(db)

    def list_campuses(self) -> List[CampusResponse]:
        campuses = self.repo.list()
        return [CampusResponse.model_validate(c) for c in campuses]

    def get_campus_by_id(self, campus_id: str) -> Optional[CampusResponse]:
        campus = self.repo.get_by_id(campus_id)
        if not campus:
            return None
        return CampusResponse.model_validate(campus)

    def get_raw_campus(self, campus_id: str) -> Optional[Campus]:
        return self.repo.get_by_id(campus_id)
