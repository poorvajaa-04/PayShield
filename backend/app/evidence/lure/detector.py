from datetime import datetime, timezone

from ..schema import EvidenceOutput

LURE_PATTERNS = {
    "fake_authority": [
        "cbi",
        "police",
        "income tax",
        "customs",
        "rbi officer",
        "cyber cell",
    ],
    "urgency": [
        "immediately",
        "within 30 minutes",
        "account will be blocked",
        "last warning",
        "act now",
    ],
    "otp_request": [
        "share the otp",
        "tell me the otp",
        "send the otp",
        "otp is",
    ],
    "screen_share": [
        "anydesk",
        "teamviewer",
        "screen share",
        "quick support",
    ],
    "fake_refund": [
        "refund",
        "cashback",
        "collect request",
        "excess payment",
    ],
}


def classify(text: str, case_id: str | None = None) -> EvidenceOutput:
    text_l = text.lower()

    hits = {}

    for pattern_name, keywords in LURE_PATTERNS.items():
        found = [keyword for keyword in keywords if keyword in text_l]

        if found:
            hits[pattern_name] = found

    if not hits:
        return EvidenceOutput(
            stream="lure",
            probability=0.02,
            matched_pattern=None,
            case_id=case_id,
            timestamp=datetime.now(timezone.utc),
        )

    base = 0.35
    probability = min(0.97, base + 0.18 * len(hits))

    priority = [
        "otp_request",
        "screen_share",
        "fake_authority",
        "urgency",
        "fake_refund",
    ]

    top = next(
        (pattern for pattern in priority if pattern in hits),
        list(hits.keys())[0],
    )

    label_map = {
        "fake_authority": "fake CBI/police script",
        "urgency": "high-pressure urgency script",
        "otp_request": "OTP-harvesting request",
        "screen_share": "remote-access-tool request",
        "fake_refund": "fake refund/collect-request script",
    }

    return EvidenceOutput(
        stream="lure",
        probability=round(probability, 2),
        matched_pattern=label_map[top],
        case_id=case_id,
        timestamp=datetime.now(timezone.utc),
    )