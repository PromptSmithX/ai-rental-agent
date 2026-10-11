from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_campus_service
from app.services.campus_service import CampusService
from app.schemas.campus import CampusResponse

router = APIRouter(prefix="/campuses", tags=["Campuses"])


@router.get("", response_model=List[CampusResponse], summary="List all campuses")
def list_campuses(
    service: CampusService = Depends(get_campus_service),
) -> List[CampusResponse]:
    """Retrieve all available university campuses."""
    return service.list_campuses()


@router.get("/{campus_id}", response_model=CampusResponse, summary="Get campus by ID")
def get_campus(
    campus_id: str,
    service: CampusService = Depends(get_campus_service),
) -> CampusResponse:
    """Retrieve details for a specific campus."""
    campus = service.get_campus_by_id(campus_id)
    if not campus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus with id '{campus_id}' not found",
        )
    return campus
