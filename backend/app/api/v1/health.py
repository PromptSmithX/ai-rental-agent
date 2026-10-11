from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()


@router.get("/health", summary="Health Check")
def health_check(db: Session = Depends(get_db)) -> Dict[str, str]:
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok",
        "version": "1.0.0",
        "database": db_status,
        "dataset_mode": "demo",
    }
