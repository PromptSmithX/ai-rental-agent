from typing import List, Optional
from sqlalchemy.orm import Session
from app.domain.models import Campus


class CampusRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> List[Campus]:
        return self.db.query(Campus).order_by(Campus.id).all()

    def get_by_id(self, campus_id: str) -> Optional[Campus]:
        return self.db.query(Campus).filter(Campus.id == campus_id).first()

    def create(self, campus: Campus) -> Campus:
        self.db.add(campus)
        self.db.commit()
        self.db.refresh(campus)
        return campus
