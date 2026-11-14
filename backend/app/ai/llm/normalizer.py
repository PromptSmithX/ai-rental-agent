import re
from typing import Any, List, Optional, Union
from app.ai.schemas.filters import FilterOperation


def normalize_vietnamese_price(val: Any) -> Optional[int]:
    """Normalize Vietnamese currency expressions to integer VND.
    
    Examples:
    - 3000000 -> 3000000
    - "3 triệu" / "3 trieu" / "3tr" / "3 củ" -> 3000000
    - "2,5 triệu" / "2.5tr" / "2tr5" -> 2500000
    - "500k" / "500 ngàn" / "500 nghìn" -> 500000
    - "1 tỷ" -> 1000000000
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return int(val)

    s = str(val).lower().strip().replace(" ", "").replace("_", "")

    # Clean punctuation inside numbers, e.g. 3.000.000 or 3,000,000
    clean_numeric = re.sub(r"[,\.](?=\d{3})", "", s)
    if clean_numeric.isdigit():
        return int(clean_numeric)

    # 1. Pattern: "2tr5" -> 2.5 triệu
    m_split = re.match(r"^(\d+)tr(\d+)$", s)
    if m_split:
        whole = int(m_split.group(1))
        dec = int(m_split.group(2))
        return int(whole * 1_000_000 + dec * 100_000)

    # 2. Pattern: "3 triệu", "2.5tr", "3 củ"
    m_million = re.match(r"^(\d+(?:[,\.]\d+)?)(?:triệu|trieu|tr|củ|cu)$", s)
    if m_million:
        num_str = m_million.group(1).replace(",", ".")
        return int(float(num_str) * 1_000_000)

    # 3. Pattern: "500k", "500 ngàn", "500 nghìn"
    m_thousand = re.match(r"^(\d+(?:[,\.]\d+)?)(?:k|ngàn|ngan|nghìn|nghin)$", s)
    if m_thousand:
        num_str = m_thousand.group(1).replace(",", ".")
        return int(float(num_str) * 1_000)

    # 4. Pattern: "1 tỷ"
    m_billion = re.match(r"^(\d+(?:[,\.]\d+)?)(?:tỷ|ty)$", s)
    if m_billion:
        num_str = m_billion.group(1).replace(",", ".")
        return int(float(num_str) * 1_000_000_000)

    # Fallback to direct digits
    digits_only = re.sub(r"[^\d]", "", s)
    if digits_only:
        try:
            return int(digits_only)
        except ValueError:
            pass

    return None


def normalize_vietnamese_distance(val: Any) -> Optional[float]:
    """Normalize Vietnamese distance expressions to straight-line float kilometers.
    
    Examples:
    - 2.0 -> 2.0
    - "2 km" / "2km" / "2 cây số" -> 2.0
    - "1,5 km" / "1.5km" -> 1.5
    - "500m" / "500 mét" -> 0.5
    - "800m" -> 0.8
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).lower().strip().replace(" ", "")

    # Meters: "500m", "500met"
    m_meters = re.match(r"^(\d+(?:[,\.]\d+)?)(?:m|met|mét)$", s)
    if m_meters:
        num_str = m_meters.group(1).replace(",", ".")
        return round(float(num_str) / 1000.0, 2)

    # Kilometers: "2km", "1.5km", "2cây"
    m_km = re.match(r"^(\d+(?:[,\.]\d+)?)(?:km|cây|caysô|câyso|câysố)?$", s)
    if m_km:
        num_str = m_km.group(1).replace(",", ".")
        try:
            return round(float(num_str), 2)
        except ValueError:
            pass

    return None


def normalize_vietnamese_area(val: Any) -> Optional[float]:
    """Normalize Vietnamese area expressions to float square meters (m²).
    
    Examples:
    - 20.0 -> 20.0
    - "20m2" / "20 m2" / "20 mét vuông" -> 20.0
    - "25,5 m2" -> 25.5
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).lower().strip().replace(" ", "")
    m_area = re.match(r"^(\d+(?:[,\.]\d+)?)(?:m2|m²|metvuong|métvuông)?$", s)
    if m_area:
        num_str = m_area.group(1).replace(",", ".")
        try:
            return round(float(num_str), 1)
        except ValueError:
            pass
    return None


def normalize_filter_operations(operations: List[FilterOperation]) -> List[FilterOperation]:
    """Normalize numeric values within filter operations deterministically."""
    normalized: List[FilterOperation] = []

    for op in operations:
        field = op.field
        val = op.value

        if field in ("max_price_vnd", "maxPriceVnd", "max_price", "maxPrice"):
            norm_val = normalize_vietnamese_price(val)
            normalized.append(FilterOperation(op=op.op, field="max_price_vnd", value=norm_val if norm_val is not None else val))
        elif field in ("max_distance_km", "maxDistanceKm", "max_distance", "maxDistance"):
            norm_val = normalize_vietnamese_distance(val)
            normalized.append(FilterOperation(op=op.op, field="max_distance_km", value=norm_val if norm_val is not None else val))
        elif field in ("min_area_m2", "minAreaM2", "min_area", "minArea"):
            norm_val = normalize_vietnamese_area(val)
            normalized.append(FilterOperation(op=op.op, field="min_area_m2", value=norm_val if norm_val is not None else val))
        else:
            normalized.append(op)

    return normalized
