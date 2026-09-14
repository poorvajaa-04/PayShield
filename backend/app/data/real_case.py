from __future__ import annotations

from .cic_ids_adapter import load_cic_sample
from .paysim_adapter import load_paysim_sample


LARGE_TRANSACTION_THRESHOLD = 10_000


def _network_features(row: dict) -> dict:
    """
    Convert normalized CIC-IDS2017 flow features into the input shape
    expected by PayShield's existing network detector.

    These are derived behavioural features.
    CIC's ground-truth label is never passed to the detector.
    """

    total_packets = row["total_packets"]
    packets_per_minute = row["flow_packets_per_second"] * 60

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

        # Metadata retained for the investigation layer.
        "dataset": "CIC-IDS2017",
        "ground_truth_label": row["ground_truth_label"],
        "destination_port": row["destination_port"],
        "flow_duration": row["flow_duration"],
        "total_packets": row["total_packets"],
        "total_bytes": row["total_bytes"],
    }


def _transaction_features(row: dict) -> dict:
    """
    Convert a real PaySim transaction into the pipeline's transaction format.

    is_fraud is deliberately retained only as ground truth metadata.
    It is NOT used by the correlator or policy engine.
    """

    return {
        "type": "transaction",

        "amount": row["amount"],

        "from_account": row["from_account"],

        "to_account": row["to_account"],

        "t": str(row["step"]),

        # Dataset provenance / validation metadata.
        "dataset": "PaySim",
        "transaction_type": row["transaction_type"],
        "ground_truth_fraud": row["is_fraud"],
        "ground_truth_flagged_fraud": row["is_flagged_fraud"],
    }


def build_real_case(
    case_id: str = "PS-REAL-001",
) -> list[dict]:
    """
    Build a PayShield investigation script from real datasets.

    Sources
    -------
    CIC-IDS2017:
        Supplies real network-security flow evidence.

    PaySim:
        Supplies a real fraudulent transaction and real account identities.

    Important
    ---------
    Dataset labels are retained only as ground-truth metadata.
    They are NOT passed into PayShield's detectors or decision logic.
    """

    # ---------------------------------------------------------------
    # Find a real CIC attack flow
    # ---------------------------------------------------------------

    cic_rows = load_cic_sample(
        rows=25,
        attack_only=True,
    )

    if not cic_rows:
        raise RuntimeError(
            "No attack records found in CIC-IDS2017."
        )

    # Prefer a flow that produces meaningful request-rate behaviour.
    network = max(
        cic_rows,
        key=lambda row: row["flow_packets_per_second"],
    )

    # ---------------------------------------------------------------
    # Find a real PaySim fraudulent transaction above the
    # existing PayShield money-movement threshold.
    # ---------------------------------------------------------------

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

    # Use the largest qualifying real fraudulent transaction.
    transaction = max(
        qualifying_transactions,
        key=lambda row: row["amount"],
    )

    # ---------------------------------------------------------------
    # Build normalized PayShield case script
    # ---------------------------------------------------------------

    return [
        _network_features(network),
        _transaction_features(transaction),
    ]