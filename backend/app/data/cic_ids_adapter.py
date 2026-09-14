"""
CIC-IDS2017 adapter for PayShield.

Purpose:
    Convert raw CIC-IDS2017 flow records into normalized network evidence
    that PayShield can consume.

Important:
    - CIC-IDS2017 is used as the real network-security dataset.
    - Label is ground truth for validation, not an input to the detector.
    - CSVs are read in chunks to avoid loading huge files into memory.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterator, Optional

import pandas as pd


# ---------------------------------------------------------------------------
# Dataset paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]

CIC_DATA_DIR = PROJECT_ROOT / "data" / "raw" / "cic-ids" / "MachineLearningCVE"


# ---------------------------------------------------------------------------
# CIC labels
# ---------------------------------------------------------------------------

ATTACK_LABELS = {
    "DDoS",
    "DoS Hulk",
    "DoS GoldenEye",
    "DoS slowloris",
    "DoS Slowhttptest",
    "PortScan",
    "Bot",
    "Infiltration",
    "Web Attack   Brute Force",
    "Web Attack   XSS",
    "Web Attack   Sql Injection",
}


def normalize_label(label: object) -> str:
    """
    Normalize the CIC label into a clean string.
    """

    if pd.isna(label):
        return "UNKNOWN"

    value = str(label).strip()

    # Handle common encoding variants found in CIC files.
    replacements = {
        "Web Attack   Brute Force": "Web Attack - Brute Force",
        "Web Attack   XSS": "Web Attack - XSS",
        "Web Attack   Sql Injection": "Web Attack - Sql Injection",
    }

    return replacements.get(value, value)


# ---------------------------------------------------------------------------
# File discovery
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Required columns
# ---------------------------------------------------------------------------

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
    Make sure the CIC file contains the fields required by PayShield.
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


# ---------------------------------------------------------------------------
# Safe numeric conversion
# ---------------------------------------------------------------------------

def numeric(row: pd.Series, column: str) -> float:
    """
    Safely extract a numeric feature from a CIC row.
    """

    value = pd.to_numeric(
        row.get(column, 0),
        errors="coerce",
    )

    if pd.isna(value):
        return 0.0

    return float(value)


# ---------------------------------------------------------------------------
# Flow -> normalized PayShield evidence
# ---------------------------------------------------------------------------

def normalize_flow(row: pd.Series) -> dict:
    """
    Convert one CIC-IDS2017 flow into PayShield's normalized network evidence.

    The Label is preserved as ground_truth_label for validation.
    It is NOT used when calculating the detector probability.
    """

    destination_port = int(numeric(row, "Destination Port"))

    flow_duration = numeric(row, "Flow Duration")

    total_fwd_packets = numeric(row, "Total Fwd Packets")
    total_bwd_packets = numeric(row, "Total Backward Packets")

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

    # ---------------------------------------------------------------
    # Derived behavioural features
    # ---------------------------------------------------------------

    total_packets = (
        total_fwd_packets +
        total_bwd_packets
    )

    total_bytes = (
        total_fwd_bytes +
        total_bwd_bytes
    )

    packet_asymmetry = abs(
        total_fwd_packets -
        total_bwd_packets
    )

    connection_flags = {
        "syn": syn_count,
        "rst": rst_count,
        "fin": fin_count,
        "ack": ack_count,
        "psh": psh_count,
    }

    # ---------------------------------------------------------------
    # Normalized PayShield record
    # ---------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Streaming CIC records
# ---------------------------------------------------------------------------

def iter_cic_flows(
    files: Optional[list[Path]] = None,
    chunk_size: int = 10_000,
) -> Iterator[dict]:
    """
    Stream normalized CIC records without loading the complete dataset.

    Example:

        for flow in iter_cic_flows():
            print(flow)
    """

    if files is None:
        files = get_cic_files()

    for file_path in files:

        for chunk in pd.read_csv(
            file_path,
            chunksize=chunk_size,
            low_memory=False,
        ):

            # Remove accidental whitespace around column names.
            chunk.columns = [
                str(column).strip()
                for column in chunk.columns
            ]

            validate_columns(
                list(chunk.columns)
            )

            for _, row in chunk.iterrows():

                yield normalize_flow(row)


# ---------------------------------------------------------------------------
# Small sample loader
# ---------------------------------------------------------------------------

def load_cic_sample(
    rows: int = 100,
    attack_only: bool = False,
) -> list[dict]:
    """
    Load a small number of CIC records for testing.

    This does NOT load the complete dataset.
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


# ---------------------------------------------------------------------------
# Dataset statistics
# ---------------------------------------------------------------------------

def inspect_dataset(
    max_rows_per_file: int = 10_000,
) -> dict:
    """
    Produce lightweight dataset statistics.

    Only a limited number of rows per file are inspected.
    """

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