from datetime import datetime, timezone

from app.evidence.schema import EvidenceOutput


def classify(text: str) -> EvidenceOutput:
    return EvidenceOutput(
        stream="lure",
        probability=0.0,
        matched_pattern="placeholder",
        case_id="PLACEHOLDER",
        timestamp=datetime.now(timezone.utc),
    )