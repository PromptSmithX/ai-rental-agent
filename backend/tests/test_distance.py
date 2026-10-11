import pytest
from app.services.distance import calculate_air_distance_km, format_distance_vi


def test_distance_zero_when_identical():
    lat = 10.7721
    lon = 106.6579
    assert calculate_air_distance_km(lat, lon, lat, lon) == 0.0


def test_distance_hcmut_ltk_to_room_01():
    # HCMUT LTK: 10.7721, 106.6579
    # Room 01: 10.7635, 106.6625 (~1.1 km)
    dist = calculate_air_distance_km(10.7721, 106.6579, 10.7635, 106.6625)
    assert dist is not None
    assert 0.9 <= dist <= 1.3
    assert dist == 1.1


def test_distance_between_two_campuses():
    # LTK: 10.7721, 106.6579; DA: 10.8805, 106.8054 (~20 km)
    dist = calculate_air_distance_km(10.7721, 106.6579, 10.8805, 106.8054)
    assert dist is not None
    assert 18.0 <= dist <= 22.0


def test_distance_null_when_missing_coordinate():
    assert calculate_air_distance_km(None, 106.6579, 10.7721, 106.6579) is None
    assert calculate_air_distance_km(10.7721, None, 10.7721, 106.6579) is None
    assert calculate_air_distance_km(10.7721, 106.6579, None, 106.6579) is None
    assert calculate_air_distance_km(10.7721, 106.6579, 10.7721, None) is None


def test_distance_out_of_bounds_coordinates():
    assert calculate_air_distance_km(95.0, 106.0, 10.0, 106.0) is None
    assert calculate_air_distance_km(10.0, 190.0, 10.0, 106.0) is None


def test_format_distance_vi():
    assert format_distance_vi(None) == "Vị trí chưa rõ"
    formatted = format_distance_vi(1.4)
    assert "1.4" in formatted or "1,4" in formatted
    assert "đường chim bay" in formatted
