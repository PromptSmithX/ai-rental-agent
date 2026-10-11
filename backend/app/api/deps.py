from typing import Generator
from fastapi import Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.campus_service import CampusService
from app.services.room_service import RoomService


def get_campus_service(db: Session = Depends(get_db)) -> CampusService:
    return CampusService(db)


def get_room_service(db: Session = Depends(get_db)) -> RoomService:
    return RoomService(db)
