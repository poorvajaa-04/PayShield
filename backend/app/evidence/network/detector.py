"""
Network evidence detector for PayShield.

Contains:

    1. Existing synthetic/demo network detector.
    2. CIC-IDS2017 adapter.
    3. CIC-IDS2017 behavioural detector.

Important:
    - CIC-IDS2017 ground-truth labels are validation metadata only.
    - Ground-truth labels are NEVER used to calculate detector probability.
    - Non-finite CIC values are normalized to safe numeric values.
    - CIC records are processed independently from the dataset labels.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Optional

import pandas as pd

from ..schema import EvidenceOutput


# ============================================================================
# DATASET PATHS
# ============================================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

CIC_DATA_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "cic-ids"
    / "MachineLearningCVE"
)


# ============================================================================
# CIC-IDS2017 LABELS
# ============================================================================

# These values are already normalized to the strings produced by
# normalize_label().
#
# They are used ONLY by validation/sample helpers.
# They are NOT used by classify_cic_flow().

ATTACK_LABELS = {
    "DDoS",
    "DoS Hulk",
    "DoS GoldenEye",
    "DoS slowloris",
    "DoS Slowhttptest",
    "PortScan",
    "Bot",
    "Infiltration",
    "Web Attack - Brute Force",
    "Web Attack - XSS",
    "Web Attack - Sql Injection",
    "Heartbleed",
    "FTP-Patator",
    "SSH-Patator",
}


def normalize_label(label: object) -> str:
    """
    Normalize a CIC-IDS2017 ground-truth label.

    The normalized label is retained for validation and investigation
    metadata only.
    """

    if pd.isna(label):
        return "UNKNOWN"

    value = str(label).strip()

    replacements = {
        "Web Attack   Brute Force": "Web Attack - Brute Force",
        "Web Attack   XSS": "Web Attack - XSS",
        "Web Attack   Sql Injection": "Web Attack - Sql Injection",
    }

    return replacements.get(value, value)


# ============================================================================
# FILE DISCOVERY
# ============================================================================

def get_cic_files() -> list[Path]:
    """
    Return all CIC-IDS2017 CSV files available in the project.
    """

    if not CIC_DATA_DIR.exists():
        raise FileNotFoundError(
            f"CIC-IDS2017 directory not found: {CIC_DATA_DIR}"
        )

    files = sorted(CIC_DATA_DIR.glob("*.csv"))

    if not files:
        raise FileNotFoundError(
            f"No CIC-IDS2017 CSV files found in: {CIC_DATA_DIR}"
        )

    return files


# ============================================================================
# REQUIRED COLUMNS
# ============================================================================

REQUIRED_COLUMNS = [
    "Destination Port",
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "SYN Flag Count",
    "RST Flag Count",
    "FIN Flag Count",
    "ACK Flag Count",
    "PSH Flag Count",
    "Average Packet Size",
    "Label",
]


def validate_columns(columns: list[str]) -> None:
    """
    Make sure the CIC file contains all fields required by PayShield.
    """

    available = set(columns)

    missing = [
        column
        for column in REQUIRED_COLUMNS
        if column not in available
    ]

    if missing:
        raise ValueError(
            "CIC file is missing required columns: "
            + ", ".join(missing)
        )


# ============================================================================
# SAFE NUMERIC CONVERSION
# ============================================================================

def numeric(row: pd.Series, column: str) -> float:
    """
    Safely extract a finite numeric feature from a CIC row.

    CIC-IDS2017 contains rate fields that may become NaN, +inf or -inf,
    especially for zero-duration flows.

    PayShield normalizes all non-finite values to 0.0 before they enter
    the detector/API layer.
    """

    value = pd.to_numeric(
        row.get(column, 0),
        errors="coerce",
    )

    if pd.isna(value):
        return 0.0

    value = float(value)

    if not math.isfinite(value):
        return 0.0

    return value


# ============================================================================
# FLOW -> NORMALIZED PAYSHIELD EVIDENCE
# ============================================================================

def normalize_flow(row: pd.Series) -> dict:
    """
    Convert one CIC-IDS2017 flow into normalized PayShield network evidence.

    The CIC Label is preserved as ground_truth_label for validation.

    It is NOT used by classify_cic_flow().
    """

    destination_port = int(
        numeric(row, "Destination Port")
    )

    flow_duration = numeric(
        row,
        "Flow Duration",
    )

    total_fwd_packets = numeric(
        row,
        "Total Fwd Packets",
    )

    total_bwd_packets = numeric(
        row,
        "Total Backward Packets",
    )

    total_fwd_bytes = numeric(
        row,
        "Total Length of Fwd Packets",
    )

    total_bwd_bytes = numeric(
        row,
        "Total Length of Bwd Packets",
    )

    flow_bytes_per_second = numeric(
        row,
        "Flow Bytes/s",
    )

    flow_packets_per_second = numeric(
        row,
        "Flow Packets/s",
    )

    fwd_packets_per_second = numeric(
        row,
        "Fwd Packets/s",
    )

    bwd_packets_per_second = numeric(
        row,
        "Bwd Packets/s",
    )

    syn_count = int(
        numeric(row, "SYN Flag Count")
    )

    rst_count = int(
        numeric(row, "RST Flag Count")
    )

    fin_count = int(
        numeric(row, "FIN Flag Count")
    )

    ack_count = int(
        numeric(row, "ACK Flag Count")
    )

    psh_count = int(
        numeric(row, "PSH Flag Count")
    )

    average_packet_size = numeric(
        row,
        "Average Packet Size",
    )

    label = normalize_label(
        row.get("Label")
    )

    # ------------------------------------------------------------------------
    # DERIVED FEATURES
    # ------------------------------------------------------------------------

    total_packets = (
        total_fwd_packets
        + total_bwd_packets
    )

    total_bytes = (
        total_fwd_bytes
        + total_bwd_bytes
    )

    packet_asymmetry = abs(
        total_fwd_packets
        - total_bwd_packets
    )

    connection_flags = {
        "syn": syn_count,
        "rst": rst_count,
        "fin": fin_count,
        "ack": ack_count,
        "psh": psh_count,
    }

    # ------------------------------------------------------------------------
    # NORMALIZED PAYSHIELD RECORD
    # ------------------------------------------------------------------------

    return {
        "stream": "network",
        "source": "CIC-IDS2017",
        "destination_port": destination_port,
        "flow_duration": flow_duration,
        "total_packets": total_packets,
        "total_bytes": total_bytes,
        "forward_packets": total_fwd_packets,
        "backward_packets": total_bwd_packets,
        "forward_bytes": total_fwd_bytes,
        "backward_bytes": total_bwd_bytes,
        "flow_bytes_per_second": flow_bytes_per_second,
        "flow_packets_per_second": flow_packets_per_second,
        "forward_packets_per_second": fwd_packets_per_second,
        "backward_packets_per_second": bwd_packets_per_second,
        "packet_asymmetry": packet_asymmetry,
        "average_packet_size": average_packet_size,
        "connection_flags": connection_flags,
        "ground_truth_label": label,
    }


# ============================================================================
# STREAMING CIC RECORDS
# ============================================================================

def iter_cic_flows(
    files: Optional[list[Path]] = None,
    chunk_size: int = 10_000,
) -> Iterator[dict]:
    """
    Stream normalized CIC records without loading the entire dataset.

    Example:

        for flow in iter_cic_flows():
            print(flow)
    """

    if files is None:
        files = get_cic_files()

    if chunk_size <= 0:
        raise ValueError(
            "chunk_size must be greater than 0."
        )

    for file_path in files:

        for chunk in pd.read_csv(
            file_path,
            chunksize=chunk_size,
            low_memory=False,
        ):

            chunk.columns = [
                str(column).strip()
                for column in chunk.columns
            ]

            validate_columns(
                list(chunk.columns)
            )

            for _, row in chunk.iterrows():
                yield normalize_flow(row)


# ============================================================================
# SMALL SAMPLE LOADER
# ============================================================================

def load_cic_sample(
    rows: int = 100,
    attack_only: bool = False,
) -> list[dict]:
    """
    Load a small number of CIC records for testing.

    This does not load the complete dataset.
    """

    if rows <= 0:
        return []

    results: list[dict] = []

    for flow in iter_cic_flows(
        chunk_size=max(rows, 100),
    ):

        label = flow["ground_truth_label"]

        if attack_only and label not in ATTACK_LABELS:
            continue

        results.append(flow)

        if len(results) >= rows:
            break

    return results


# ============================================================================
# DATASET STATISTICS
# ============================================================================

def inspect_dataset(
    max_rows_per_file: int = 10_000,
) -> dict:
    """
    Produce lightweight CIC dataset statistics.

    Only a limited number of rows per file are inspected.
    """

    if max_rows_per_file <= 0:
        raise ValueError(
            "max_rows_per_file must be greater than 0."
        )

    files = get_cic_files()

    statistics = {
        "dataset": "CIC-IDS2017",
        "directory": str(CIC_DATA_DIR),
        "files": len(files),
        "file_names": [
            file.name
            for file in files
        ],
        "labels": {},
        "rows_inspected": 0,
    }

    for file_path in files:

        for chunk in pd.read_csv(
            file_path,
            chunksize=max_rows_per_file,
            nrows=max_rows_per_file,
            low_memory=False,
        ):

            chunk.columns = [
                str(column).strip()
                for column in chunk.columns
            ]

            validate_columns(
                list(chunk.columns)
            )

            labels = (
                chunk["Label"]
                .map(normalize_label)
                .value_counts()
                .to_dict()
            )

            for label, count in labels.items():

                statistics["labels"][label] = (
                    statistics["labels"].get(label, 0)
                    + int(count)
                )

            statistics["rows_inspected"] += len(chunk)

            break

    return statistics


# ============================================================================
# EXISTING GENERIC NETWORK DETECTOR
# ============================================================================

def classify(
    failed_logins: int,
    requests_per_minute: float,
    distinct_source_ips: int,
    case_id: str | None = None,
) -> EvidenceOutput:
    """
    Existing PayShield synthetic/demo network detector.

    Kept for backwards compatibility with:

        - existing tests
        - manual/demo scripts
        - synthetic network evidence
    """

    if failed_logins >= 8 and distinct_source_ips >= 5:

        probability = min(
            0.98,
            0.6 + 0.03 * failed_logins,
        )

        return EvidenceOutput(
            stream="network",
            probability=round(
                probability,
                2,
            ),
            matched_pattern=(
                f"credential stuffing: "
                f"{failed_logins} failed logins "
                f"from {distinct_source_ips} distinct IPs"
            ),
            case_id=case_id,
            timestamp=datetime.now(timezone.utc),
        )

    if failed_logins >= 5:

        probability = min(
            0.9,
            0.4 + 0.05 * failed_logins,
        )

        return EvidenceOutput(
            stream="network",
            probability=round(
                probability,
                2,
            ),
            matched_pattern=(
                f"brute-force pattern: "
                f"{failed_logins} failed logins"
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

        ground_truth_label is NOT used to calculate probability.

    The detector makes its decision from network behaviour only.

    The CIC label is retained as metadata so validation code can later
    compare detector behaviour against known dataset labels.

    This is a prototype behavioural detector, not a trained CIC classifier.
    """

    if flow.get("stream") != "network":
        raise ValueError(
            "classify_cic_flow() expects a network evidence record."
        )

    # ------------------------------------------------------------------------
    # EXTRACT FEATURES
    # ------------------------------------------------------------------------

    destination_port = int(
        flow.get(
            "destination_port",
            0,
        )
    )

    flow_duration = float(
        flow.get(
            "flow_duration",
            0,
        )
    )

    total_packets = float(
        flow.get(
            "total_packets",
            0,
        )
    )

    total_bytes = float(
        flow.get(
            "total_bytes",
            0,
        )
    )

    flow_packets_per_second = float(
        flow.get(
            "flow_packets_per_second",
            0,
        )
    )

    flow_bytes_per_second = float(
        flow.get(
            "flow_bytes_per_second",
            0,
        )
    )

    packet_asymmetry = float(
        flow.get(
            "packet_asymmetry",
            0,
        )
    )

    flags = flow.get(
        "connection_flags",
        {},
    )

    syn_count = int(
        flags.get(
            "syn",
            0,
        )
    )

    rst_count = int(
        flags.get(
            "rst",
            0,
        )
    )

    # ------------------------------------------------------------------------
    # BEHAVIOURAL INDICATORS
    # ------------------------------------------------------------------------

    indicators: list[str] = []

    probability = 0.03

    # High packet-rate behaviour.
    if flow_packets_per_second >= 1000:

        probability += 0.30

        indicators.append(
            f"high packet rate "
            f"({flow_packets_per_second:.0f} packets/s)"
        )

    elif flow_packets_per_second >= 500:

        probability += 0.20

        indicators.append(
            f"elevated packet rate "
            f"({flow_packets_per_second:.0f} packets/s)"
        )

    # High byte-rate behaviour.
    if flow_bytes_per_second >= 1_000_000:

        probability += 0.25

        indicators.append(
            f"high byte rate "
            f"({flow_bytes_per_second:.0f} bytes/s)"
        )

    elif flow_bytes_per_second >= 500_000:

        probability += 0.15

        indicators.append(
            f"elevated byte rate "
            f"({flow_bytes_per_second:.0f} bytes/s)"
        )

    # SYN-heavy behaviour.
    if syn_count >= 5:

        probability += 0.20

        indicators.append(
            f"SYN-heavy connection behaviour "
            f"({syn_count} SYN flags)"
        )

    # Reset-heavy behaviour.
    if rst_count >= 5:

        probability += 0.15

        indicators.append(
            f"abnormal reset activity "
            f"({rst_count} RST flags)"
        )

    # Strong forward/backward asymmetry.
    if total_packets > 0:

        asymmetry_ratio = (
            packet_asymmetry
            / total_packets
        )

        if asymmetry_ratio >= 0.80:

            probability += 0.10

            indicators.append(
                "strong forward/backward packet asymmetry"
            )

    # NOTE:
    # The previous implementation used:
    #
    #     flow_duration <= 100
    #
    # together with packet-rate thresholds.
    #
    # CIC Flow Duration is represented in microseconds, so that condition
    # was too aggressive for a generic prototype heuristic. It has therefore
    # intentionally been removed rather than pretending to have a validated
    # short-flow threshold.

    # ------------------------------------------------------------------------
    # DESTINATION-PORT CONTEXT
    # ------------------------------------------------------------------------

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

    # ------------------------------------------------------------------------
    # PROBABILITY
    # ------------------------------------------------------------------------

    probability = min(
        0.98,
        probability,
    )

    probability = round(
        probability,
        2,
    )

    # ------------------------------------------------------------------------
    # MATCHED PATTERN
    # ------------------------------------------------------------------------

    if indicators:

        matched_pattern = (
            "CIC network anomaly: "
            + "; ".join(indicators)
            + f" | {port_context}"
        )

    else:

        matched_pattern = None

    # ------------------------------------------------------------------------
    # GROUND TRUTH METADATA
    # ------------------------------------------------------------------------

    ground_truth_label = flow.get(
        "ground_truth_label",
        "UNKNOWN",
    )

    # ------------------------------------------------------------------------
    # STANDARD PAYSHIELD EVIDENCE
    # ------------------------------------------------------------------------

    evidence = EvidenceOutput(
        stream="network",
        probability=probability,
        matched_pattern=matched_pattern,
        case_id=case_id,
        timestamp=datetime.now(timezone.utc),
    )

    # ------------------------------------------------------------------------
    # DATASET METADATA
    # ------------------------------------------------------------------------
    #
    # EvidenceOutput may be a strict Pydantic/dataclass model.
    # Preserve the existing compatibility behaviour by attempting to attach
    # dataset-specific fields without making them part of the core evidence
    # interface.

    try:

        evidence.source = "CIC-IDS2017"

        evidence.ground_truth_label = (
            ground_truth_label
        )

        evidence.destination_port = (
            destination_port
        )

        evidence.flow_duration = (
            flow_duration
        )

        evidence.total_packets = (
            total_packets
        )

        evidence.total_bytes = (
            total_bytes
        )

        evidence.flow_packets_per_second = (
            flow_packets_per_second
        )

        evidence.flow_bytes_per_second = (
            flow_bytes_per_second
        )

        evidence.packet_asymmetry = (
            packet_asymmetry
        )

        evidence.connection_flags = (
            flags
        )

    except Exception:
        # Core EvidenceOutput remains valid even if the model does not allow
        # additional attributes.
        pass

    return evidence