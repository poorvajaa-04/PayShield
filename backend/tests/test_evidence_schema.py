from app.evidence.schema import EvidenceOutput
from app.evidence.lure.detector import classify as classify_lure
from app.evidence.network.detector import classify as classify_network
from app.evidence.session.detector import classify as classify_session


def test_lure_detector_returns_valid_evidence():
    result = classify_lure("placeholder text")

    assert isinstance(result, EvidenceOutput)
    assert result.stream == "lure"


def test_network_detector_returns_valid_evidence():
    result = classify_network({})

    assert isinstance(result, EvidenceOutput)
    assert result.stream == "network"


def test_session_detector_returns_valid_evidence():
    result = classify_session({})

    assert isinstance(result, EvidenceOutput)
    assert result.stream == "session"