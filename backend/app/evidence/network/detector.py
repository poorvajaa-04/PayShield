from datetime import datetime, timezone

from ..schema import EvidenceOutput

def classify(
    failed_logins: int,
    requests_per_minute: float,
    distinct_source_ips: int,
    case_id: str | None = None,
) -> EvidenceOutput:

    if failed_logins >= 8 and distinct_source_ips >= 5:
        probability = min(0.98, 0.6 + 0.03 * failed_logins)

        return EvidenceOutput(
            stream="network",
            probability=round(probability, 2),
            matched_pattern=(
                f"credential stuffing: {failed_logins} failed logins "
                f"from {distinct_source_ips} distinct IPs"
            ),
            case_id=case_id,
            timestamp=datetime.now(timezone.utc),
        )

    if failed_logins >= 5:
        probability = min(0.9, 0.4 + 0.05 * failed_logins)

        return EvidenceOutput(
            stream="network",
            probability=round(probability, 2),
            matched_pattern=(
                f"brute-force pattern: {failed_logins} failed logins"
            ),
            case_id=case_id,
            timestamp=datetime.now(timezone.utc),
        )

    if requests_per_minute >= 120:
        return EvidenceOutput(
            stream="network",
            probability=0.70,
            matched_pattern=(
                f"automated traffic: "
                f"{requests_per_minute:.0f} requests/min"
            ),
            case_id=case_id,
            timestamp=datetime.now(timezone.utc),
        )

    return EvidenceOutput(
        stream="network",
        probability=0.03,
        matched_pattern=None,
        case_id=case_id,
        timestamp=datetime.now(timezone.utc),
    )