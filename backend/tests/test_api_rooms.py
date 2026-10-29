from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["dataset_mode"] == "live"


def test_list_all_rooms(client: TestClient):
    response = client.get("/api/v1/rooms")
    assert response.status_code == 200
    rooms = response.json()
    assert isinstance(rooms, list)
    assert len(rooms) == 12

    # Check contract fields and camelCase naming
    first = rooms[0]
    assert "id" in first
    assert "title" in first
    assert "priceMonthlyVnd" in first
    assert "addressLabel" in first
    assert "imageUrls" in first
    assert isinstance(first["imageUrls"], list)
    assert "locationAccuracy" in first
    assert "listingStatus" in first
    assert "sourceKind" in first
    assert "isSimulated" in first
    assert first["isSimulated"] is True


def test_list_rooms_with_query_params(client: TestClient):
    response = client.get("/api/v1/rooms?max_price_vnd=2500000")
    assert response.status_code == 200
    rooms = response.json()
    assert len(rooms) > 0
    for r in rooms:
        assert r["priceMonthlyVnd"] <= 2500000


def test_structured_search_s01(client: TestClient):
    # S01: Quanh Bách Khoa LTK, <= 3 triệu, <= 2km
    payload = {
        "campusId": "hcmut-ltk",
        "maxPriceVnd": 3000000,
        "maxDistanceKm": 2.0,
        "requiredAmenities": [],
        "petAllowed": None,
        "sortBy": "recommended",
    }
    response = client.post("/api/v1/rooms/search", json=payload)
    assert response.status_code == 200
    result = response.json()

    assert "hits" in result
    assert "totalMatched" in result
    assert "appliedFilters" in result
    assert result["datasetMode"] == "live"
    assert result["totalMatched"] > 0

    hit_ids = [h["roomId"] for h in result["hits"]]
    assert "demo-room-01" in hit_ids

    # Verify hit structure
    first_hit = result["hits"][0]
    assert "roomId" in first_hit
    assert "distanceKm" in first_hit
    assert "rankingScore" in first_hit
    assert "matchReasons" in first_hit
    assert "caveats" in first_hit


def test_structured_search_s07_zero_result(client: TestClient):
    # S07: < 1 triệu, có điều hòa, nuôi mèo, < 500m
    payload = {
        "campusId": "hcmut-ltk",
        "maxPriceVnd": 1000000,
        "maxDistanceKm": 0.5,
        "requiredAmenities": ["air_conditioner"],
        "petAllowed": True,
        "sortBy": "recommended",
    }
    response = client.post("/api/v1/rooms/search", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["totalMatched"] == 0
    assert len(result["hits"]) == 0


def test_get_room_detail_s08(client: TestClient):
    # S08: Cho mình xem phòng demo-room-01
    response = client.get("/api/v1/rooms/demo-room-01")
    assert response.status_code == 200
    room = response.json()
    assert room["id"] == "demo-room-01"
    assert room["priceMonthlyVnd"] == 2800000
    assert room["areaM2"] == 22.0
    assert len(room["imageUrls"]) >= 2
    assert "images" in room
    assert len(room["images"]) >= 2
    assert room["petAllowed"] is True
    assert room["sourceKind"] == "demo"
    assert room["isSimulated"] is True


def test_get_room_detail_not_found(client: TestClient):
    response = client.get("/api/v1/rooms/demo-room-999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_openapi_documentation(client: TestClient):
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "AI Rental Copilot API"
    assert "/api/v1/campuses" in schema["paths"]
    assert "/api/v1/rooms" in schema["paths"]
    assert "/api/v1/rooms/search" in schema["paths"]
