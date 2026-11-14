"""Pure normalizers turning raw crawled strings into structured Room fields.

Every function is side-effect free and independently unit-tested. Vietnamese
rental listings use units like "triệu" (million) and "nghìn/k" (thousand), with
both "." and "," as decimal/thousand separators, so parsing is unit-aware rather
than a naive digit grab.
"""
import re
import unicodedata
from typing import List, Optional

from app.domain.enums import Amenity, ListingStatus


def _strip_accents(text: str) -> str:
    # "đ"/"Đ" (and the ₫ sign) don't decompose under NFD, so map them explicitly
    # before stripping combining marks — otherwise "điều"/"...đ" keep the đ.
    text = text.replace("đ", "d").replace("Đ", "D").replace("₫", "d")
    nfd = unicodedata.normalize("NFD", text)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def parse_price_vnd(raw: Optional[str]) -> Optional[int]:
    """Parse a header price string to monthly VND.

    "2.7 triệu/tháng" -> 2_700_000 ; "1.2 triệu" -> 1_200_000 ;
    "500 nghìn" / "500k" -> 500_000 ; "3.000.000đ" -> 3_000_000 ;
    "Thỏa thuận" / no digits -> None.
    """
    if not raw:
        return None
    text = _strip_accents(raw.lower())

    # million unit: trieu / tr  (but not "tr900k" edge — require word boundary-ish)
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:trieu|tr)\b", text)
    if m:
        val = float(m.group(1).replace(",", "."))
        return int(round(val * 1_000_000))

    # thousand unit: nghin / k
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:nghin|k)\b", text)
    if m:
        val = float(m.group(1).replace(",", "."))
        return int(round(val * 1_000))

    # plain number with thousand separators, optionally followed by đ/vnd
    m = re.search(r"(\d[\d.,]{2,})\s*(?:d|vnd|dong)?\b", text)
    if m:
        digits = re.sub(r"[.,]", "", m.group(1))
        if digits.isdigit():
            val = int(digits)
            # Guard against tiny/garbage numbers (a real monthly rent is >= 100k)
            return val if val >= 100_000 else None

    return None


def parse_area_m2(description: Optional[str]) -> Optional[float]:
    """Extract room area in m² from free-text description.

    Matches "25m2", "25 m²", "25,5 m2", "diện tích 30 mét vuông". Returns the
    first plausible value in [8, 300]; None if nothing sensible is found.
    """
    if not description:
        return None
    text = _strip_accents(description.lower())
    for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m\^2|met vuong|mv)\b", text):
        try:
            val = float(m.group(1).replace(",", "."))
        except ValueError:
            continue
        if 8.0 <= val <= 300.0:
            return val
    return None


# Vietnamese amenity keywords -> canonical Amenity enum (accent-insensitive keys)
_AMENITY_KEYWORDS = {
    Amenity.AIR_CONDITIONER: ["dieu hoa", "may lanh", "dhnd", "air con"],
    Amenity.WIFI: ["wifi", "internet", "mang"],
    Amenity.PARKING: ["gui xe", "de xe", "do xe", "ham xe", "bai xe", "parking", "cho de xe"],
    Amenity.PRIVATE_BATHROOM: ["khep kin", "wc rieng", "ve sinh rieng", "nha tam rieng", "toilet rieng"],
    Amenity.BALCONY: ["ban cong", "logia", "lo gia"],
    Amenity.KITCHEN: ["bep", "nau an", "khu bep", "ke bep"],
}


def map_amenities(
    amenity_tags: Optional[List[str]] = None,
    target_tenants: Optional[List[str]] = None,
    description: Optional[str] = None,
) -> List[Amenity]:
    """Map raw Vietnamese amenity labels / free text to canonical Amenity enums."""
    haystack_parts: List[str] = []
    for src in (amenity_tags or []), (target_tenants or []):
        haystack_parts.extend(src)
    if description:
        haystack_parts.append(description)
    haystack = _strip_accents(" ".join(haystack_parts).lower())

    found: List[Amenity] = []
    for amenity, keywords in _AMENITY_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            found.append(amenity)
    return found


def parse_pet_allowed(
    amenity_tags: Optional[List[str]] = None,
    target_tenants: Optional[List[str]] = None,
    description: Optional[str] = None,
) -> Optional[bool]:
    """Infer pet policy. Explicit 'không nuôi' -> False; 'nuôi/thú cưng/pet' -> True; else None."""
    parts: List[str] = list(amenity_tags or []) + list(target_tenants or [])
    if description:
        parts.append(description)
    hay = _strip_accents(" ".join(parts).lower())
    if not hay:
        return None
    if re.search(r"khong\s+(?:duoc\s+)?nuoi|cam\s+nuoi|khong\s+thu\s+cung", hay):
        return False
    if re.search(r"nuoi\s+(?:thu|cho|meo|pet)|thu\s+cung|nuoi\s+dc|duoc\s+nuoi", hay):
        return True
    return None


def parse_listing_status(availability_raw: Optional[str]) -> ListingStatus:
    """Map availability text to ListingStatus. Defaults to UNKNOWN (never fabricate 'available')."""
    if not availability_raw:
        return ListingStatus.UNKNOWN
    text = _strip_accents(availability_raw.lower())
    # "Phòng trống: 3" -> number of free rooms
    m = re.search(r"(\d+)", text)
    if m:
        return ListingStatus.AVAILABLE if int(m.group(1)) > 0 else ListingStatus.UNAVAILABLE
    if "con" in text or "trong" in text:
        return ListingStatus.AVAILABLE
    if "het" in text or "da thue" in text:
        return ListingStatus.UNAVAILABLE
    return ListingStatus.UNKNOWN


def build_address_label(location: dict) -> Optional[str]:
    """Pick the best address string: new -> old -> description. None if all empty."""
    if not location:
        return None
    for key in ("address_new_raw", "address_old_raw", "address_description_raw"):
        val = location.get(key)
        if val and val.strip():
            return val.strip()
    return None
