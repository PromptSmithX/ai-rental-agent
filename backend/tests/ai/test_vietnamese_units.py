import pytest
from app.ai.schemas.filters import FilterOpType, FilterOperation
from app.ai.llm.normalizer import (
    normalize_vietnamese_price,
    normalize_vietnamese_distance,
    normalize_vietnamese_area,
    normalize_filter_operations,
)


def test_normalize_vietnamese_price():
    # Millions with abbreviations
    assert normalize_vietnamese_price("3 triệu") == 3000000
    assert normalize_vietnamese_price("3 trieu") == 3000000
    assert normalize_vietnamese_price("3tr") == 3000000
    assert normalize_vietnamese_price("3 củ") == 3000000
    assert normalize_vietnamese_price("3cu") == 3000000

    # Decimals: comma and dot
    assert normalize_vietnamese_price("2,5 triệu") == 2500000
    assert normalize_vietnamese_price("2.5 triệu") == 2500000
    assert normalize_vietnamese_price("2.5tr") == 2500000
    assert normalize_vietnamese_price("2,5tr") == 2500000
    assert normalize_vietnamese_price("2tr5") == 2500000
    assert normalize_vietnamese_price("3tr2") == 3200000

    # Thousands
    assert normalize_vietnamese_price("500k") == 500000
    assert normalize_vietnamese_price("500 ngàn") == 500000
    assert normalize_vietnamese_price("500 ngan") == 500000
    assert normalize_vietnamese_price("500 nghìn") == 500000
    assert normalize_vietnamese_price("800k") == 800000

    # Billions
    assert normalize_vietnamese_price("1 tỷ") == 1000000000

    # Standard numeric strings and punctuation
    assert normalize_vietnamese_price("3000000") == 3000000
    assert normalize_vietnamese_price("3.000.000") == 3000000
    assert normalize_vietnamese_price("3,000,000") == 3000000
    assert normalize_vietnamese_price(3500000) == 3500000

    # Edge cases
    assert normalize_vietnamese_price(None) is None
    assert normalize_vietnamese_price("") is None


def test_normalize_vietnamese_distance():
    # Kilometers
    assert normalize_vietnamese_distance("2 km") == 2.0
    assert normalize_vietnamese_distance("2km") == 2.0
    assert normalize_vietnamese_distance("2 cây số") == 2.0
    assert normalize_vietnamese_distance("2 cây") == 2.0
    assert normalize_vietnamese_distance("1,5 km") == 1.5
    assert normalize_vietnamese_distance("1.5km") == 1.5
    assert normalize_vietnamese_distance(2.5) == 2.5
    assert normalize_vietnamese_distance(3) == 3.0

    # Meters to km conversion
    assert normalize_vietnamese_distance("500m") == 0.5
    assert normalize_vietnamese_distance("500 mét") == 0.5
    assert normalize_vietnamese_distance("500 met") == 0.5
    assert normalize_vietnamese_distance("800m") == 0.8
    assert normalize_vietnamese_distance("1200m") == 1.2

    # Edge cases
    assert normalize_vietnamese_distance(None) is None
    assert normalize_vietnamese_distance("") is None


def test_normalize_vietnamese_area():
    assert normalize_vietnamese_area("20m2") == 20.0
    assert normalize_vietnamese_area("20 m2") == 20.0
    assert normalize_vietnamese_area("20 m²") == 20.0
    assert normalize_vietnamese_area("20 mét vuông") == 20.0
    assert normalize_vietnamese_area("25,5 m2") == 25.5
    assert normalize_vietnamese_area("25.5m2") == 25.5
    assert normalize_vietnamese_area(22) == 22.0
    assert normalize_vietnamese_area(None) is None


def test_normalize_filter_operations():
    ops = [
        FilterOperation(op=FilterOpType.SET, field="max_price_vnd", value="3 triệu"),
        FilterOperation(op=FilterOpType.SET, field="max_distance_km", value="500m"),
        FilterOperation(op=FilterOpType.SET, field="min_area_m2", value="25 mét vuông"),
        FilterOperation(op=FilterOpType.ADD, field="required_amenities", value="air_conditioner"),
    ]

    normalized = normalize_filter_operations(ops)

    assert normalized[0].value == 3000000
    assert normalized[1].value == 0.5
    assert normalized[2].value == 25.0
    assert normalized[3].value == "air_conditioner"
