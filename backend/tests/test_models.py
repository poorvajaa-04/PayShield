from datetime import datetime, timezone

from backend.app.models.case import Case, TimelineEvent
from backend.app.evidence.schema import EvidenceOutput


def test_timeline_event_to_dict():
    event = TimelineEvent(
        t="10:30:00",
        event="test_event",
        stream="network",
        extra={"probability": 0.8},
    )

    result = event.to_dict()

    assert result["t"] == "10:30:00"
    assert result["event"] == "test_event"
    assert result["stream"] == "network"
    assert result["probability"] == 0.8


def test_timeline_event_without_stream():
    event = TimelineEvent(
        t="10:30:00",
        event="test_event",
    )

    result = event.to_dict()

    assert result == {
        "t": "10:30:00",
        "event": "test_event",
    }


def test_case_defaults():
    case = Case(case_id="CASE-001")

    assert case.case_id == "CASE-001"
    assert case.attack_state == "NONE"
    assert case.timeline == []
    assert case.evidence == []
    assert case.final_action is None


def test_case_log():
    case = Case(case_id="CASE-002")

    case.log(
        "network_anomaly_detected",
        stream="network",
        t="11:00:00",
        probability=0.75,
    )

    assert len(case.timeline) == 1

    event = case.timeline[0]

    assert event.event == "network_anomaly_detected"
    assert event.stream == "network"
    assert event.t == "11:00:00"
    assert event.extra["probability"] == 0.75


def test_case_log_generates_timestamp_when_missing():
    case = Case(case_id="CASE-003")

    case.log("test_event")

    assert len(case.timeline) == 1
    assert case.timeline[0].t


def test_case_add_evidence():
    case = Case(case_id="CASE-004")

    case.add_evidence(
        "network",
        probability=0.85,
        matched_pattern="credential stuffing",
    )

    assert len(case.evidence) == 1
    assert case.evidence[0]["stream"] == "network"
    assert case.evidence[0]["probability"] == 0.85
    assert case.evidence[0]["matched_pattern"] == "credential stuffing"


def test_case_to_dict():
    case = Case(case_id="CASE-005")

    case.log(
        "test_event",
        stream="lure",
        t="12:00:00",
    )

    case.add_evidence(
        "lure",
        probability=0.9,
    )

    case.final_action = "WARN"

    result = case.to_dict()

    assert result["case_id"] == "CASE-005"
    assert result["attack_state"] == "NONE"
    assert result["final_action"] == "WARN"
    assert len(result["timeline"]) == 1
    assert len(result["evidence"]) == 1


def test_evidence_output():
    timestamp = datetime.now(timezone.utc)

    evidence = EvidenceOutput(
        stream="lure",
        probability=0.85,
        matched_pattern="OTP-harvesting request",
        case_id="CASE-006",
        timestamp=timestamp,
    )

    assert evidence.stream == "lure"
    assert evidence.probability == 0.85
    assert evidence.matched_pattern == "OTP-harvesting request"
    assert evidence.case_id == "CASE-006"
    assert evidence.timestamp == timestamp