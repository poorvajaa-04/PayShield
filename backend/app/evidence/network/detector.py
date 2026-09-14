from datetime import datetime, timezone

from ..schema import EvidenceOutput


def classify(
    failed_logins: int,
    requests_per_minute: float,
    distinct_source_ips: int,
    case_id: str | None = None,
) -> EvidenceOutput:
    """
    Existing PayShield network detector.

    Kept for backwards compatibility with:
        - existing tests
        - manual/demo scripts
        - synthetic network evidence
    """

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


# ============================================================================
# CIC-IDS2017 DETECTOR
# ============================================================================

def classify_cic_flow(
    flow: dict,
    case_id: str | None = None,
) -> EvidenceOutput:
    """
    Analyze one normalized CIC-IDS2017 flow.

    IMPORTANT:
        ground_truth_label is NOT used to calculate the probability.

    The detector makes its decision from network behaviour only.

    The CIC label is retained only as metadata so that we can later measure
    whether PayShield's detector correctly identifies known attack traffic.
    """

    if flow.get("stream") != "network":
        raise ValueError(
            "classify_cic_flow() expects a network evidence record."
        )

    # ------------------------------------------------------------------
    # Extract normalized CIC features
    # ------------------------------------------------------------------

    destination_port = int(
        flow.get("destination_port", 0)
    )

    flow_duration = float(
        flow.get("flow_duration", 0)
    )

    total_packets = float(
        flow.get("total_packets", 0)
    )

    total_bytes = float(
        flow.get("total_bytes", 0)
    )

    flow_packets_per_second = float(
        flow.get("flow_packets_per_second", 0)
    )

    flow_bytes_per_second = float(
        flow.get("flow_bytes_per_second", 0)
    )

    packet_asymmetry = float(
        flow.get("packet_asymmetry", 0)
    )

    flags = flow.get(
        "connection_flags",
        {},
    )

    syn_count = int(
        flags.get("syn", 0)
    )

    rst_count = int(
        flags.get("rst", 0)
    )

    fin_count = int(
        flags.get("fin", 0)
    )

    ack_count = int(
        flags.get("ack", 0)
    )

    # ------------------------------------------------------------------
    # Behavioural indicators
    # ------------------------------------------------------------------

    indicators: list[str] = []

    probability = 0.03

    # Very high packet rate can indicate automated/flooding behaviour.
    if flow_packets_per_second >= 1000:
        probability += 0.30
        indicators.append(
            f"high packet rate ({flow_packets_per_second:.0f} packets/s)"
        )

    elif flow_packets_per_second >= 500:
        probability += 0.20
        indicators.append(
            f"elevated packet rate ({flow_packets_per_second:.0f} packets/s)"
        )

    # Very high byte rate can indicate traffic flooding.
    if flow_bytes_per_second >= 1_000_000:
        probability += 0.25
        indicators.append(
            f"high byte rate ({flow_bytes_per_second:.0f} bytes/s)"
        )

    elif flow_bytes_per_second >= 500_000:
        probability += 0.15
        indicators.append(
            f"elevated byte rate ({flow_bytes_per_second:.0f} bytes/s)"
        )

    # SYN-heavy behaviour.
    if syn_count >= 5:
        probability += 0.20
        indicators.append(
            f"SYN-heavy connection behaviour ({syn_count} SYN flags)"
        )

    # Reset-heavy behaviour.
    if rst_count >= 5:
        probability += 0.15
        indicators.append(
            f"abnormal reset activity ({rst_count} RST flags)"
        )

    # Strong flow asymmetry.
    if total_packets > 0:
        asymmetry_ratio = (
            packet_asymmetry /
            total_packets
        )

        if asymmetry_ratio >= 0.80:
            probability += 0.10
            indicators.append(
                "strong forward/backward packet asymmetry"
            )

    # Extremely short flows with suspicious packet intensity.
    if (
        flow_duration > 0
        and flow_duration <= 100
        and flow_packets_per_second >= 500
    ):
        probability += 0.10
        indicators.append(
            "short-duration high-intensity flow"
        )

    # ------------------------------------------------------------------
    # Destination-port context
    # ------------------------------------------------------------------

    common_web_ports = {
        80,
        443,
        8080,
        8443,
    }

    if destination_port in common_web_ports:
        port_context = (
            f"destination port {destination_port} "
            f"(web service)"
        )
    else:
        port_context = (
            f"destination port {destination_port}"
        )

    # ------------------------------------------------------------------
    # Cap and round probability
    # ------------------------------------------------------------------

    probability = min(
        0.98,
        probability,
    )

    probability = round(
        probability,
        2,
    )

    # ------------------------------------------------------------------
    # Pattern description
    # ------------------------------------------------------------------

    if indicators:

        matched_pattern = (
            "CIC network anomaly: "
            + "; ".join(indicators)
            + f" | {port_context}"
        )

    else:

        matched_pattern = None

    # ------------------------------------------------------------------
    # Ground truth is metadata ONLY
    # ------------------------------------------------------------------

    ground_truth_label = flow.get(
        "ground_truth_label",
        "UNKNOWN",
    )

    # ------------------------------------------------------------------
    # Return standard PayShield evidence
    # ------------------------------------------------------------------

    evidence = EvidenceOutput(
        stream="network",
        probability=probability,
        matched_pattern=matched_pattern,
        case_id=case_id,
        timestamp=datetime.now(timezone.utc),
    )

    # Attach dataset metadata without changing the existing EvidenceOutput
    # interface. This allows validation code to inspect the original CIC label.
    try:
        evidence.source = "CIC-IDS2017"
        evidence.ground_truth_label = ground_truth_label
        evidence.destination_port = destination_port
        evidence.flow_duration = flow_duration
        evidence.total_packets = total_packets
        evidence.total_bytes = total_bytes
        evidence.flow_packets_per_second = flow_packets_per_second
        evidence.flow_bytes_per_second = flow_bytes_per_second
        evidence.packet_asymmetry = packet_asymmetry
        evidence.connection_flags = flags
    except Exception:
        # If EvidenceOutput is a strict Pydantic/dataclass model that does not
        # permit extra attributes, the core evidence object is still valid.
        pass

    return evidence