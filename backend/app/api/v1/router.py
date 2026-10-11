from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.campuses import router as campuses_router
from app.api.v1.rooms import router as rooms_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(campuses_router)
api_v1_router.include_router(rooms_router)
