from __future__ import annotations

"""
PayShield case-data builder.

This module currently provides two case sources:

1. Prototype case:
   A small deterministic case that exercises the complete PayShield
   evidence -> correlation -> entity graph -> attack state -> policy path.

2. Real dataset case:
   CIC-IDS2017 + PaySim adapters remain available for the full
   dataset-backed implementation.

The prototype does NOT hardcode the final decision. It supplies evidence
to the existing PayShield pipeline, which performs the actual analysis.
"""

from .cic_ids_adapter import load_cic_sample
from .paysim_adapter import load_paysim_sample


LARGE_TRANSACTION_THRESHOLD = 10_000


# =====================================================================
# PROTOTYPE CASE
# =====================================================================

def build_prototype_case(
    case_id: str = "PS-REAL-001",
) -> list[dict]:
    """
    Build a small deterministic case for deployment/testing.

    IMPORTANT:
        This function only supplies evidence.

        It does NOT calculate:
        - risk score
        - attack state
        - policy decision

    Those are produced by the existing PayShield pipeline.
    """

    return [
        {
            "type": "lure",
            "text": (
                "I am calling from CBI. "
                "Share the OTP immediately or your account will be blocked."
            ),
            "identifier": "9876500000",
            "t": "10:31",
        },
        {
            "type": "network",
            "failed_logins": 9,
            "requests_per_minute": 240,
            "distinct_source_ips": 6,
            "t": "10:33",
        },
        {
            "type": "session",
            "is_new_device": True,
            "geo_velocity_kmph": 1250,
            "login_hour_local": 2,
            "remote_access_tool_detected": True,
            "device_id": "device-attack-01",
            "t": "10:34",
        },
        {
            "type": "transaction",
            "amount": 25000,
            "from_account": "ACC-1001",
            "to_account": "ACC-9001",
            "t": "10:35",
        },
    ]


# =====================================================================
# NETWORK DATASET FEATURES
# =====================================================================

def _network_features(row: dict) -> dict:
    """
    Convert normalized CIC-IDS2017 flow features into the input shape
    expected by PayShield's existing network detector.

    CIC ground-truth labels are retained only as metadata.
    """

    total_packets = row["total_packets"]

    packets_per_minute = (
        row["flow_packets_per_second"] * 60
    )

    return {
        "type": "network",

        "failed_logins": max(
            1,
            int(total_packets / 10),
        ),

        "requests_per_minute": max(
            1,
            int(packets_per_minute),
        ),

        "distinct_source_ips": 1,

        "t": "10:33",

        "dataset": "CIC-IDS2017",

        "ground_truth_label": row["ground_truth_label"],

        "destination_port": row["destination_port"],

        "flow_duration": row["flow_duration"],

        "total_packets": row["total_packets"],

        "total_bytes": row["total_bytes"],
    }


# =====================================================================
# TRANSACTION DATASET FEATURES
# =====================================================================

def _transaction_features(row: dict) -> dict:
    """
    Convert a real PaySim transaction into PayShield's transaction format.

    PaySim fraud labels are retained only as ground-truth metadata.
    They are NOT used by the correlator or policy engine.
    """

    return {
        "type": "transaction",

        "amount": row["amount"],

        "from_account": row["from_account"],

        "to_account": row["to_account"],

        "t": str(row["step"]),

        "dataset": "PaySim",

        "transaction_type": row["transaction_type"],

        "ground_truth_fraud": row["is_fraud"],

        "ground_truth_flagged_fraud": row["is_flagged_fraud"],
    }


# =====================================================================
# REAL DATASET CASE
# =====================================================================

def build_real_case_from_datasets(
    case_id: str = "PS-REAL-001",
) -> list[dict]:
    """
    Build a PayShield case from CIC-IDS2017 and PaySim.

    This is the full dataset-backed path.

    It is intentionally separate from build_prototype_case() so that
    deployment does not require the large datasets to be present.
    """

    cic_rows = load_cic_sample(
        rows=25,
        attack_only=True,
    )

    if not cic_rows:
        raise RuntimeError(
            "No attack records found in CIC-IDS2017."
        )

    network = max(
        cic_rows,
        key=lambda row: row["flow_packets_per_second"],
    )

    paysim_rows = load_paysim_sample(
        limit=50,
        fraud_only=True,
    )

    if not paysim_rows:
        raise RuntimeError(
            "No fraud records found in PaySim."
        )

    qualifying_transactions = [
        row
        for row in paysim_rows
        if row["amount"] >= LARGE_TRANSACTION_THRESHOLD
    ]

    if not qualifying_transactions:
        raise RuntimeError(
            "No PaySim fraudulent transaction met the "
            f"₹{LARGE_TRANSACTION_THRESHOLD:,} threshold."
        )

    transaction = max(
        qualifying_transactions,
        key=lambda row: row["amount"],
    )

    return [
        _network_features(network),
        _transaction_features(transaction),
    ]