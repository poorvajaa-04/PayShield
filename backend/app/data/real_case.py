from __future__ import annotations

"""
PayShield case-data builder.

This module provides two distinct case sources:

1. Prototype case:
   A small deterministic case used by the demo/prototype workflow.

2. Real dataset case:
   CIC-IDS2017 and PaySim records are converted into the same
   PayShield pipeline input format.

IMPORTANT:

The real-data path does not use dataset ground-truth labels to make
the actual detection or policy decision.

Ground-truth labels may be used only to construct a bounded evaluation
sample. The selected records are then passed through the normal
PayShield pipeline:

    evidence
        ↓
    entity graph
        ↓
    correlator
        ↓
    attack state
        ↓
    investigation
        ↓
    timeline
        ↓
    orchestrator
        ↓
    policy decision
"""

from hashlib import sha256
import json

from .cic_ids_adapter import load_cic_sample
from .paysim_adapter import iter_paysim


# ---------------------------------------------------------------------------
# REAL-DATA SAMPLE CONFIGURATION
# ---------------------------------------------------------------------------

# CIC-IDS2017:
# Read a bounded candidate pool through the existing chunked adapter.
CIC_SAMPLE_ROWS = 500

# Number of CIC records that actually enter the real-data case.
CIC_NETWORK_RECORDS = 15


# PaySim:
#
# We do NOT simply take the first N fraud rows.
#
# Instead we stream a bounded portion of PaySim, identify a small number
# of real fraud anchor transactions, and then collect actual transactions
# involving those anchor accounts.
#
# This produces a more useful real transaction topology without
# fabricating any relationships.
PAYSIM_GRAPH_TRANSACTIONS = 25

# Number of fraud transactions used only to establish the evaluation
# scenario / graph anchors.
PAYSIM_FRAUD_ANCHORS = 5

# Maximum number of PaySim rows examined by the connected-sample
# selector.
#
# This is a hard bound. The complete dataset is never loaded into memory.
PAYSIM_MAX_SCAN_ROWS = 2_000_000


# =====================================================================
# PROTOTYPE CASE
# =====================================================================

def build_prototype_case(
    case_id: str = "PS-REAL-001",
) -> list[dict]:
    """
    Build the deterministic PayShield prototype case.

    This function only supplies evidence.

    It does NOT calculate:
        - risk score
        - attack state
        - policy decision
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

    The identifier is derived from the dataset record itself.

    Detection output and ground-truth labels are not used to construct
    the identifier.
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

    The CIC ground-truth label is preserved as metadata only.
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

        # Evaluation metadata only.
        "ground_truth_label": (
            row["ground_truth_label"]
        ),

        # The CIC adapter currently does not expose an original
        # timestamp, so retain a deterministic sequence timestamp.
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

    PaySim ground-truth fields are preserved only as evaluation
    metadata.
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

        # Evaluation metadata only.
        "ground_truth_fraud": (
            row["is_fraud"]
        ),

        "ground_truth_flagged_fraud": (
            row["is_flagged_fraud"]
        ),
    }


# =====================================================================
# PAYSim CONNECTED SAMPLE SELECTION
# =====================================================================

def _select_connected_paysim_transactions(
    transaction_limit: int,
    fraud_anchor_limit: int,
    max_scan_rows: int,
) -> list[dict]:
    """
    Select a bounded PaySim sample with naturally connected accounts.

    Strategy
    --------
    1. Stream the real PaySim dataset through the existing adapter.
    2. Identify a small number of actual fraudulent transactions.
    3. Treat the accounts appearing in those transactions as graph
       anchors.
    4. Continue through the real dataset.
    5. Include actual transactions that touch those anchor accounts.
    6. Continue expanding the account set when a selected transaction
       introduces another connected account.
    7. Stop once the requested bounded transaction count is reached.

    IMPORTANT
    ---------
    The fraud label is used ONLY to establish a bounded evaluation
    scenario.

    It is NOT converted into:
        suspicious = True
        fraud = True
        risk = high

    Every selected transaction still enters the normal PayShield
    Entity Graph and Correlator.

    No synthetic transaction is created.
    No synthetic edge is created.
    """

    if transaction_limit <= 0:
        return []

    if fraud_anchor_limit <= 0:
        return []

    if max_scan_rows <= 0:
        return []

    selected: list[dict] = []
    selected_ids: set[str] = set()

    # Accounts that participate in the selected graph scenario.
    connected_accounts: set[str] = set()

    # Fraud transactions are anchors only. Their label is never used
    # after the transaction has been selected.
    fraud_anchor_count = 0

    rows_scanned = 0

    for row in iter_paysim(
        chunk_size=100_000,
        fraud_only=False,
    ):
        rows_scanned += 1

        if rows_scanned > max_scan_rows:
            break

        record_id = _dataset_record_id(
            "PaySim",
            row,
        )

        if record_id in selected_ids:
            continue

        from_account = row["from_account"]
        to_account = row["to_account"]

        # -------------------------------------------------------------
        # Stage 1:
        # Find a small number of actual fraud transactions.
        #
        # This is sample construction/evaluation only.
        # -------------------------------------------------------------
        if (
            row["is_fraud"] == 1
            and fraud_anchor_count < fraud_anchor_limit
        ):
            selected.append(row)
            selected_ids.add(record_id)

            connected_accounts.add(
                from_account
            )
            connected_accounts.add(
                to_account
            )

            fraud_anchor_count += 1

            if len(selected) >= transaction_limit:
                break

            continue

        # -------------------------------------------------------------
        # Stage 2:
        # Once anchors exist, select ACTUAL transactions involving
        # those accounts.
        #
        # This is what creates real multi-edge topology.
        # -------------------------------------------------------------
        touches_connected_account = (
            from_account in connected_accounts
            or to_account in connected_accounts
        )

        if not touches_connected_account:
            continue

        selected.append(row)
        selected_ids.add(record_id)

        # Expand the graph using actual observed relationships.
        connected_accounts.add(
            from_account
        )
        connected_accounts.add(
            to_account
        )

        if len(selected) >= transaction_limit:
            break

    # -------------------------------------------------------------
    # Fallback:
    #
    # If the bounded scan did not produce enough connected records,
    # return the real records we actually found rather than fabricating
    # relationships.
    # -------------------------------------------------------------
    return selected[:transaction_limit]


# =====================================================================
# CIC REPRESENTATIVE SAMPLE SELECTION
# =====================================================================

def _select_network_records(
    rows: list[dict],
    limit: int,
) -> list[dict]:
    """
    Select a small representative set of CIC attack records.

    The ground-truth label is used only to construct the prototype
    evaluation sample.

    The selected flows still go through the normal CIC detector.
    """
    if not rows:
        return []

    if limit <= 0:
        return []

    # Prefer diversity across attack labels.
    best_by_label: dict[str, dict] = {}

    for row in rows:
        label = str(
            row.get(
                "ground_truth_label",
                "UNKNOWN",
            )
        )

        existing = best_by_label.get(label)

        if (
            existing is None
            or row["flow_packets_per_second"]
            > existing["flow_packets_per_second"]
        ):
            best_by_label[label] = row

    selected: list[dict] = list(
        best_by_label.values()
    )

    selected.sort(
        key=lambda row: row["flow_packets_per_second"],
        reverse=True,
    )

    if len(selected) > limit:
        return selected[:limit]

    selected_ids = {
        _dataset_record_id(
            "CIC-IDS2017",
            row,
        )
        for row in selected
    }

    remaining = sorted(
        rows,
        key=lambda row: row["flow_packets_per_second"],
        reverse=True,
    )

    for row in remaining:
        record_id = _dataset_record_id(
            "CIC-IDS2017",
            row,
        )

        if record_id in selected_ids:
            continue

        selected.append(row)
        selected_ids.add(record_id)

        if len(selected) >= limit:
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
        - bounded candidate sample
        - multiple representative attack flows
        - ground truth is used only for sample construction

    PaySim:
        - bounded streaming scan
        - small number of real fraud anchors
        - surrounding real transactions involving those accounts
        - naturally connected transaction topology

    The resulting records enter the normal PayShield pipeline.
    """

    # =================================================================
    # CIC-IDS2017
    # =================================================================

    cic_rows = load_cic_sample(
        rows=CIC_SAMPLE_ROWS,
        attack_only=True,
    )

    if not cic_rows:
        raise RuntimeError(
            "No attack records found in CIC-IDS2017."
        )

    selected_network_records = (
        _select_network_records(
            rows=cic_rows,
            limit=CIC_NETWORK_RECORDS,
        )
    )

    if not selected_network_records:
        raise RuntimeError(
            "No representative CIC-IDS2017 records "
            "were available for the real-data case."
        )

    network_steps = [
        _network_features(
            row,
            sequence=index,
        )
        for index, row in enumerate(
            selected_network_records
        )
    ]

    # =================================================================
    # PaySim
    # =================================================================

    selected_transactions = (
        _select_connected_paysim_transactions(
            transaction_limit=PAYSIM_GRAPH_TRANSACTIONS,
            fraud_anchor_limit=PAYSIM_FRAUD_ANCHORS,
            max_scan_rows=PAYSIM_MAX_SCAN_ROWS,
        )
    )

    if not selected_transactions:
        raise RuntimeError(
            "No PaySim transactions were available "
            "for the connected graph scenario."
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
        *network_steps,
        *transaction_steps,
    ]