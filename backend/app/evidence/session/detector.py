from datetime import datetime, timezone

from app.evidence.schema import EvidenceOutput


def classify(
    is_new_device: bool,
    geo_velocity_kmph: float,
    login_hour_local: int,
    remote_access_tool_detected: bool,
    case_id: str | None = None,
) -> EvidenceOutput:

    if remote_access_tool_detected:
        return EvidenceOutput(
            stream="session",
            probability=0.95,
            matched_pattern=(
                "remote-access-tool indicator "
                "(e.g. AnyDesk/TeamViewer active)"
            ),
            case_id=case_id,
            timestamp=datetime.now(timezone.utc),
        )

    if geo_velocity_kmph > 800:
        return EvidenceOutput(
            stream="session",
            probability=0.90,
            matched_pattern=(
                f"impossible travel "
                f"({geo_velocity_kmph:.0f} km/h implied)"
            ),
            case_id=case_id,
            timestamp=datetime.now(timezone.utc),
        )

    if is_new_device and (login_hour_local < 5 or login_hour_local > 23):
        return EvidenceOutput(
            stream="session",
            probability=0.75,
            matched_pattern="new device + off-hours login",
            case_id=case_id,
            timestamp=datetime.now(timezone.utc),
        )

    if is_new_device:
        return EvidenceOutput(
            stream="session",
            probability=0.55,
            matched_pattern="new device",
            case_id=case_id,
            timestamp=datetime.now(timezone.utc),
        )

    return EvidenceOutput(
        stream="session",
        probability=0.05,
        matched_pattern=None,
        case_id=case_id,
        timestamp=datetime.now(timezone.utc),
    )