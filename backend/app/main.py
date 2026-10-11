from contextlib import asynccontextmanager
from typing import Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.v1.router import api_v1_router
from app.seeds.seed_data import seed_database
from app.domain.models import Room


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed demo fixtures if empty (skip during testing)
    if settings.ENVIRONMENT != "testing":
        try:
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            try:
                room_count = db.query(Room).count()
                if room_count == 0:
                    print("Database empty. Auto-seeding representative demo data...")
                    seed_database(db)
                    print("Auto-seeding complete.")
            finally:
                db.close()
        except Exception as e:
            print(f"Warning during startup database initialization: {e}")

    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Business Backend API for AI Rental Copilot — Vietnamese student housing discovery.",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", summary="Root API Info")
def root() -> Dict[str, str]:
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
        "dataset_mode": settings.DATASET_MODE,
        "note": "AI mô phỏng / Dữ liệu minh họa (Simulated MVP backend)",
    }
