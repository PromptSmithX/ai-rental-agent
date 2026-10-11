from datetime import datetime
from typing import Any, List, Optional
from pydantic import Field, model_validator
from app.domain.enums import LocationAccuracy, ListingStatus, SourceKind, Amenity
from app.schemas.base import CamelModel


class RoomImageBase(CamelModel):
    image_url: str
    caption: Optional[str] = None
    display_order: int = 0


class RoomImageCreate(RoomImageBase):
    pass


class RoomImageResponse(RoomImageBase):
    id: int
    room_id: str
    created_at: Optional[datetime] = None


class RoomBase(CamelModel):
    id: str
    title: str
    price_monthly_vnd: int
    area_m2: Optional[float] = None
    address_label: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy: LocationAccuracy = LocationAccuracy.UNKNOWN
    amenities: List[Amenity] = Field(default_factory=list)
    pet_allowed: Optional[bool] = None
    listing_status: ListingStatus = ListingStatus.UNKNOWN
    source_kind: SourceKind = SourceKind.DEMO
    source_url: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    utilities_monthly_estimate_vnd: Optional[int] = None
    is_simulated: bool = True


class RoomCreate(RoomBase):
    images: Optional[List[RoomImageCreate]] = None


class RoomUpdate(CamelModel):
    title: Optional[str] = None
    price_monthly_vnd: Optional[int] = None
    area_m2: Optional[float] = None
    address_label: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy: Optional[LocationAccuracy] = None
    amenities: Optional[List[Amenity]] = None
    pet_allowed: Optional[bool] = None
    listing_status: Optional[ListingStatus] = None
    source_kind: Optional[SourceKind] = None
    source_url: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    utilities_monthly_estimate_vnd: Optional[int] = None
    is_simulated: Optional[bool] = None


class RoomView(CamelModel):
    """Canonical Room representation matching frontend RoomView contract."""
    id: str
    title: str
    price_monthly_vnd: int
    area_m2: Optional[float] = None
    image_urls: List[str] = Field(default_factory=list)
    address_label: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy: LocationAccuracy = LocationAccuracy.UNKNOWN
    amenities: List[Amenity] = Field(default_factory=list)
    pet_allowed: Optional[bool] = None
    listing_status: ListingStatus = ListingStatus.UNKNOWN
    source_kind: SourceKind = SourceKind.DEMO
    source_url: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    utilities_monthly_estimate_vnd: Optional[int] = None
    is_simulated: bool = True

    @model_validator(mode="before")
    @classmethod
    def populate_from_orm(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # If imageUrls/image_urls already present, preserve it
            return data
        if hasattr(data, "__table__"):
            images = getattr(data, "images", []) or []
            return {
                "id": data.id,
                "title": data.title,
                "price_monthly_vnd": data.price_monthly_vnd,
                "area_m2": data.area_m2,
                "image_urls": [img.image_url for img in images],
                "address_label": data.address_label,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "location_accuracy": data.location_accuracy,
                "amenities": data.amenities or [],
                "pet_allowed": data.pet_allowed,
                "listing_status": data.listing_status,
                "source_kind": data.source_kind,
                "source_url": data.source_url,
                "last_checked_at": data.last_checked_at,
                "utilities_monthly_estimate_vnd": data.utilities_monthly_estimate_vnd,
                "is_simulated": getattr(data, "is_simulated", True),
            }
        return data


class RoomDetailResponse(RoomView):
    """Detailed room response including normalized image records."""
    images: List[RoomImageResponse] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def populate_from_orm(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        if hasattr(data, "__table__"):
            images = getattr(data, "images", []) or []
            return {
                "id": data.id,
                "title": data.title,
                "price_monthly_vnd": data.price_monthly_vnd,
                "area_m2": data.area_m2,
                "image_urls": [img.image_url for img in images],
                "images": images,
                "address_label": data.address_label,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "location_accuracy": data.location_accuracy,
                "amenities": data.amenities or [],
                "pet_allowed": data.pet_allowed,
                "listing_status": data.listing_status,
                "source_kind": data.source_kind,
                "source_url": data.source_url,
                "last_checked_at": data.last_checked_at,
                "utilities_monthly_estimate_vnd": data.utilities_monthly_estimate_vnd,
                "is_simulated": getattr(data, "is_simulated", True),
            }
        return data


class RoomListResponse(CamelModel):
    items: List[RoomView]
    total: int
