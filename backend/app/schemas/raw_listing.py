from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ImageReference(BaseModel):
    model_config = ConfigDict(extra="allow")

    source_url: str
    position: int = 0
    alt_raw: Optional[str] = None
    is_cover: bool = False
    source_thumbnail_url: Optional[str] = None


class SourceCoordinates(BaseModel):
    model_config = ConfigDict(extra="allow")

    lat: Optional[float] = None
    lng: Optional[float] = None
    evidence: Optional[str] = None
    precision_claim: Optional[str] = None


class SourceInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    site: str = "tromoi"
    url: Optional[str] = None
    canonical_url: Optional[str] = None
    source_listing_id: Optional[str] = None
    category_url: Optional[str] = None
    scope_city: str = "ha_noi"


class FetchInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    fetched_at: Optional[str] = None
    http_status: Optional[int] = None
    final_url: Optional[str] = None
    content_type: Optional[str] = None
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    html_sha256: Optional[str] = None
    parser_version: str = "1.0.0"


class ListingInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    title_raw: Optional[str] = None
    category_raw: Optional[str] = None
    badges_raw: List[str] = Field(default_factory=list)
    posted_date_raw: Optional[str] = None
    availability_raw: Optional[str] = None
    units_count_raw: Optional[str] = None


class PricingInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    header_price_raw: Optional[str] = None
    description_price_mentions_raw: List[str] = Field(default_factory=list)
    fee_mentions_raw: List[str] = Field(default_factory=list)


class LocationInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    address_new_raw: Optional[str] = None
    address_old_raw: Optional[str] = None
    address_description_raw: Optional[str] = None
    map_href_raw: Optional[str] = None
    source_coordinates: Optional[SourceCoordinates] = None


class AttributesInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    amenity_tags_raw: List[str] = Field(default_factory=list)
    target_tenants_raw: List[str] = Field(default_factory=list)
    surroundings_tags_raw: List[str] = Field(default_factory=list)
    other_tags_raw: List[str] = Field(default_factory=list)


class ContentInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    description_text_raw: Optional[str] = None
    description_html_raw: Optional[str] = None
    sections_raw: Dict[str, Any] = Field(default_factory=dict)


class MediaInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    images: List[ImageReference] = Field(default_factory=list)
    video_present: bool = False
    video_page_url: Optional[str] = None


class CaptureInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    field_sources: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    extra_raw: Dict[str, Any] = Field(default_factory=dict)


class RawListingPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    schema_version: str = "1.0.0"
    source: SourceInfo = Field(default_factory=SourceInfo)
    fetch: FetchInfo = Field(default_factory=FetchInfo)
    listing: ListingInfo = Field(default_factory=ListingInfo)
    pricing: PricingInfo = Field(default_factory=PricingInfo)
    location: LocationInfo = Field(default_factory=LocationInfo)
    attributes: AttributesInfo = Field(default_factory=AttributesInfo)
    content: ContentInfo = Field(default_factory=ContentInfo)
    media: MediaInfo = Field(default_factory=MediaInfo)
    capture: CaptureInfo = Field(default_factory=CaptureInfo)
