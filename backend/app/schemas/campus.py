from typing import Optional
from app.schemas.base import CamelModel


class CampusBase(CamelModel):
    id: str
    university_name: str
    campus_name: str
    latitude: float
    longitude: float


class CampusCreate(CampusBase):
    pass


class CampusUpdate(CamelModel):
    university_name: Optional[str] = None
    campus_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CampusResponse(CampusBase):
    pass
