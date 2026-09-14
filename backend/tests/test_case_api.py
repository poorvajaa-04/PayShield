import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi.testclient import TestClient
from backend.app.main import app, cases


client = TestClient(app)


def setup_function():
    cases.clear()


def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "project": "PayShield",
        "status": "running",
    }


def test_create_case():
    response = client.post(
        "/cases",
        json={"case_id": "TEST-CASE-001"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["case_id"] == "TEST-CASE-001"
    assert data["timeline"] == []
    assert data["attack_state"] == "NONE"
    assert data["evidence"] == []
    assert data["final_action"] is None


def test_add_event():
    client.post(
        "/cases",
        json={"case_id": "TEST-CASE-002"},
    )

    response = client.post(
        "/cases/TEST-CASE-002/events",
        json={
            "t": "15:30:00",
            "event": "suspicious_connection",
            "stream": "network",
            "extra": {
                "probability": 0.8,
            },
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data["timeline"]) == 1
    assert data["timeline"][0]["event"] == "suspicious_connection"
    assert data["timeline"][0]["stream"] == "network"


def test_get_case():
    client.post(
        "/cases",
        json={"case_id": "TEST-CASE-003"},
    )

    response = client.get("/cases/TEST-CASE-003")

    assert response.status_code == 200
    assert response.json()["case_id"] == "TEST-CASE-003"


def test_missing_case_returns_404():
    response = client.get("/cases/DOES-NOT-EXIST")

    assert response.status_code == 404
    assert response.json()["detail"] == "Case not found"


def test_add_event_to_missing_case_returns_404():
    response = client.post(
        "/cases/DOES-NOT-EXIST/events",
        json={
            "t": "15:30:00",
            "event": "test_event",
            "stream": "network",
            "extra": {},
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Case not found"


def test_case_can_be_retrieved_after_event():
    client.post(
        "/cases",
        json={"case_id": "TEST-CASE-004"},
    )

    client.post(
        "/cases/TEST-CASE-004/events",
        json={
            "t": "16:00:00",
            "event": "login_attempt",
            "stream": "session",
            "extra": {},
        },
    )

    response = client.get("/cases/TEST-CASE-004")

    assert response.status_code == 200
    assert len(response.json()["timeline"]) == 1