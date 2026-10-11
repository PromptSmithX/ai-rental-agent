from enum import Enum


class LocationAccuracy(str, Enum):
    VERIFIED = "verified"
    APPROXIMATE = "approximate"
    UNKNOWN = "unknown"


class ListingStatus(str, Enum):
    UNKNOWN = "unknown"
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"


class SourceKind(str, Enum):
    DEMO = "demo"
    AUTHORIZED_LISTING = "authorized_listing"
    OWNER_SUBMITTED = "owner_submitted"


class Amenity(str, Enum):
    AIR_CONDITIONER = "air_conditioner"
    WIFI = "wifi"
    PARKING = "parking"
    PRIVATE_BATHROOM = "private_bathroom"
    BALCONY = "balcony"
    KITCHEN = "kitchen"


class SortByOption(str, Enum):
    RECOMMENDED = "recommended"
    PRICE_ASC = "price_asc"
    DISTANCE_ASC = "distance_asc"
