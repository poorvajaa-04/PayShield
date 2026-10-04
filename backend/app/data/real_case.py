from __future__ import annotations

"""
PayShield case-data builder.

This module provides two distinct case sources:

1. Prototype case:
   A small deterministic case used by the deployed/demo workflow.

2. Real dataset case:
   CIC-IDS2017 and PaySim records are converted into the same
   PayShield pipeline input format.

IMPORTANT:

The real-data path does not use dataset ground-truth labels to decide
which records are suspicious.

Ground-truth labels are retained only as evaluation metadata.

The real dataset records are evidence sources. They are passed into
the existing PayShield detectors, Entity Graph, Correlator, Attack State,
Investigation, Timeline, Orchestrator and Explainability layers.
"""

from hashlib import sha256
import json

from .cic_ids_adapter import load_cic_sample
from .paysim_adapter import load_paysim_sample


# ---------------------------------------------------------------------------
# REAL-DATA SAMPLE CONFIGURATION
# ---------------------------------------------------------------------------

CIC_SAMPLE_ROWS = 500

# Read a bounded portion of PaySim so the deployed prototype does not
# repeatedly scan the complete dataset.
PAYSIM_SAMPLE_ROWS = 2_000

# Number of PaySim transactions included in the final graph scenario.
PAYSIM_GRAPH_TRANSACTIONS = 10

# Number of consecutive PaySim steps used by the scenario.
PAYSIM_TEMPORAL_STEPS = 5


# =====================================================================
# PROTOTYPE CASE
# =====================================================================

def build_prototype_case(
    case_id: str = "PS-REAL-001",
) -> list[dict]:
    """
    Build the existing deterministic PayShield prototype case.

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
            "identifier_kind": "phone",
            "account_id": "ACC-1001",
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
            "account_id": "ACC-1001",
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
# DATASET RECORD IDENTIFICATION
# =====================================================================

def _dataset_record_id(
    source: str,
    row: dict,
) -> str:
    """
    Create a deterministic identifier for a normalized dataset record.

    The identifier is derived from the normalized record rather than from
    any detection result or ground-truth label.
    """

    canonical = json.dumps(
        row,
        sort_keys=True,
        default=str,
    )

    digest = sha256(
        canonical.encode("utf-8")
    ).hexdigest()[:16]

    return f"{source}:{digest}"


# =====================================================================
# CIC-IDS2017 DATASET FEATURES
# =====================================================================

def _network_features(
    row: dict,
    sequence: int,
) -> dict:
    """
    Convert one normalized CIC-IDS2017 record into a PayShield
    network pipeline step.

    Real CIC behavioural features are preserved.

    ground_truth_label remains evaluation metadata only.
    """

    return {
        "type": "network",
        "stream": "network",
        "source": "CIC-IDS2017",

        "dataset_record_id": _dataset_record_id(
            "CIC-IDS2017",
            row,
        ),

        "dataset_sequence": sequence,

        "destination_port": row["destination_port"],
        "flow_duration": row["flow_duration"],

        "total_packets": row["total_packets"],
        "total_bytes": row["total_bytes"],

        "forward_packets": row["forward_packets"],
        "backward_packets": row["backward_packets"],

        "forward_bytes": row["forward_bytes"],
        "backward_bytes": row["backward_bytes"],

        "flow_bytes_per_second": (
            row["flow_bytes_per_second"]
        ),

        "flow_packets_per_second": (
            row["flow_packets_per_second"]
        ),

        "forward_packets_per_second": (
            row["forward_packets_per_second"]
        ),

        "backward_packets_per_second": (
            row["backward_packets_per_second"]
        ),

        "packet_asymmetry": row["packet_asymmetry"],

        "average_packet_size": (
            row["average_packet_size"]
        ),

        "connection_flags": row["connection_flags"],

        # Ground truth metadata only.
        "ground_truth_label": (
            row["ground_truth_label"]
        ),

        # CIC adapter does not currently expose the original timestamp.
        # This is therefore a deterministic sequence timestamp.
        "t": f"10:{sequence:02d}",
    }


# =====================================================================
# PAYSim DATASET FEATURES
# =====================================================================

def _transaction_features(
    row: dict,
    sequence: int,
) -> dict:
    """
    Convert one normalized PaySim transaction into the existing
    PayShield transaction pipeline format.

    PaySim ground-truth labels are preserved only as metadata.
    """

    return {
        "type": "transaction",
        "stream": "transaction",
        "source": "PaySim",

        "dataset_record_id": _dataset_record_id(
            "PaySim",
            row,
        ),

        "dataset_sequence": sequence,

        "amount": row["amount"],

        "from_account": row["from_account"],

        "to_account": row["to_account"],

        "transaction_type": (
            row["transaction_type"]
        ),

        # Native PaySim temporal unit.
        "dataset_step": row["step"],

        # Existing Timeline representation.
        "t": str(row["step"]),

        # Ground truth metadata only.
        "ground_truth_fraud": (
            row["is_fraud"]
        ),

        "ground_truth_flagged_fraud": (
            row["is_flagged_fraud"]
        ),
    }


# =====================================================================
# PAYSim TEMPORAL WINDOW SELECTION
# =====================================================================

def _select_temporal_transactions(
    rows: list[dict],
    transaction_limit: int,
    temporal_steps: int,
) -> list[dict]:
    """
    Select a small chronological PaySim window.

    The selection intentionally does NOT use:
        - isFraud
        - isFlaggedFraud
        - transaction amount

    Instead:

        1. Find the earliest available PaySim step.
        2. Select transactions from consecutive steps.
        3. Preserve original dataset order within each step.
        4. Stop after the requested number of transactions.

    This produces a meaningful temporal sequence without fabricating
    timestamps or using ground-truth labels for selection.
    """

    if not rows:
        return []

    if transaction_limit <= 0:
        return []

    if temporal_steps <= 0:
        return []

    # PaySim's dataset is already ordered by step, but sorting here makes
    # the temporal intent explicit and protects this function if the
    # adapter implementation changes later.
    chronological_rows = sorted(
        rows,
        key=lambda row: row["step"],
    )

    start_step = chronological_rows[0]["step"]

    end_step = (
        start_step
        + temporal_steps
        - 1
    )

    selected: list[dict] = []

    for row in chronological_rows:
        step = row["step"]

        if step < start_step:
            continue

        if step > end_step:
            break

        selected.append(row)

        if len(selected) >= transaction_limit:
            break

    return selected


# =====================================================================
# REAL DATASET CASE
# =====================================================================

def build_real_case_from_datasets(
    case_id: str = "PS-REAL-001",
) -> list[dict]:
    """
    Build a PayShield case from the real CIC-IDS2017 and PaySim datasets.

    CIC:
        - bounded sample
        - representative attack flow when available
        - ground truth is used only to construct the evaluation scenario
        - ground truth is NOT passed into the detector as a decision signal

    PaySim:
        - bounded neutral sample
        - consecutive temporal window
        - original order within each step preserved
        - ground truth is not used for selection

    The resulting records enter the normal PayShield pipeline.
    """

    # =================================================================
    # CIC-IDS2017
    # =================================================================

    cic_rows = load_cic_sample(
        rows=CIC_SAMPLE_ROWS,
        attack_only=False,
    )

    if not cic_rows:
        raise RuntimeError(
            "No records found in CIC-IDS2017."
        )

    # -------------------------------------------------------------
    # Select a representative attack record for the real-data
    # evaluation scenario.
    #
    # IMPORTANT:
    #
    # ground_truth_label is used ONLY here to construct the
    # evaluation scenario.
    #
    # It is NOT passed to classify_cic_flow() as a decision signal.
    #
    # The selected record still goes through the normal CIC
    # detector and the normal PayShield pipeline.
    # -------------------------------------------------------------

    attack_candidates = [
        row
        for row in cic_rows
        if str(
            row.get("ground_truth_label", "")
        ).upper()
        not in {
            "BENIGN",
            "BENIGN TRAFFIC",
        }
    ]

    if attack_candidates:

        network = max(
            attack_candidates,
            key=lambda row: row[
                "flow_packets_per_second"
            ],
        )

    else:

        # Safe fallback if the bounded sample contains
        # no labelled attack records.
        network = max(
            cic_rows,
            key=lambda row: row[
                "flow_packets_per_second"
            ],
        )

    network_step = _network_features(
        network,
        sequence=0,
    )

    # =================================================================
    # PaySim
    # =================================================================

    paysim_rows = load_paysim_sample(
        limit=PAYSIM_SAMPLE_ROWS,
        fraud_only=False,
    )

    if not paysim_rows:
        raise RuntimeError(
            "No records found in PaySim."
        )

    selected_transactions = _select_temporal_transactions(
        rows=paysim_rows,
        transaction_limit=PAYSIM_GRAPH_TRANSACTIONS,
        temporal_steps=PAYSIM_TEMPORAL_STEPS,
    )

    if not selected_transactions:
        raise RuntimeError(
            "No PaySim transactions were available "
            "for the temporal analysis window."
        )

    transaction_steps = [
        _transaction_features(
            row,
            sequence=index + 1,
        )
        for index, row in enumerate(
            selected_transactions
        )
    ]

    # =================================================================
    # FINAL PAYSHIELD SCRIPT
    # =================================================================

    return [
        network_step,
        *transaction_steps,
    ]