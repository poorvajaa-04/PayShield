from datetime import datetime, timezone

from app.evidence.schema import EvidenceOutput


def classify(traffic_features: dict) -> EvidenceOutput:
    return EvidenceOutput(
        stream="network",
        probability=0.0,
        matched_pattern="placeholder",
        case_id="PLACEHOLDER",
        timestamp=datetime.now(timezone.utc),
    )