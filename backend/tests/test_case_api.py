from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_create_case():
    response = client.post(
        "/cases",
        json={"case_id": "TEST-CASE-001"}
    )

    assert response.status_code == 200
    assert response.json()["case_id"] == "TEST-CASE-001"
    assert response.json()["timeline"] == []


def test_add_event():
    client.post(
        "/cases",
        json={"case_id": "TEST-CASE-002"}
    )

    response = client.post(
        "/cases/TEST-CASE-002/events",
        json={
            "stream": "network",
            "event_type": "suspicious_connection",
            "timestamp": "2026-09-13T15:30:00Z"
        }
    )

    assert response.status_code == 200
    assert len(response.json()["timeline"]) == 1
    assert response.json()["timeline"][0]["event_type"] == "suspicious_connection"


def test_get_case():
    client.post(
        "/cases",
        json={"case_id": "TEST-CASE-003"}
    )

    response = client.get("/cases/TEST-CASE-003")

    assert response.status_code == 200
    assert response.json()["case_id"] == "TEST-CASE-003"


def test_missing_case_returns_404():
    response = client.get("/cases/DOES-NOT-EXIST")

    assert response.status_code == 404
    assert response.json()["detail"] == "Case not found"