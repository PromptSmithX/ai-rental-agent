from fastapi.testclient import TestClient


def test_list_campuses(client: TestClient):
    response = client.get("/api/v1/campuses")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    # Check camelCase fields compatibility
    first = data[0]
    assert "id" in first
    assert "universityName" in first
    assert "campusName" in first
    assert "latitude" in first
    assert "longitude" in first

    ids = [c["id"] for c in data]
    assert "hcmut-ltk" in ids
    assert "hcmut-da" in ids


def test_get_campus_by_id_success(client: TestClient):
    response = client.get("/api/v1/campuses/hcmut-ltk")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "hcmut-ltk"
    assert "Bách Khoa" in data["universityName"]
    assert data["latitude"] == 10.7721
    assert data["longitude"] == 106.6579


def test_get_campus_by_id_not_found(client: TestClient):
    response = client.get("/api/v1/campuses/non-existent")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
