from backend.app.entity_graph.entity_graph import EntityGraph
from backend.app.pipeline import run_case


def _cic_sample() -> dict:
    """
    Minimal normalized CIC-IDS2017 record.

    The ground-truth label is deliberately present to prove that it
    survives as metadata without being required by the detector.
    """

    return {
        "type": "network",
        "stream": "network",
        "source": "CIC-IDS2017",
        "dataset_record_id": "CIC-IDS2017:test-record-001",

        "destination_port": 443,
        "flow_duration": 50.0,

        "total_packets": 2000.0,
        "total_bytes": 2_000_000.0,

        "forward_packets": 1800.0,
        "backward_packets": 200.0,

        "forward_bytes": 1_800_000.0,
        "backward_bytes": 200_000.0,

        "flow_bytes_per_second": 2_000_000.0,
        "flow_packets_per_second": 2000.0,

        "forward_packets_per_second": 1800.0,
        "backward_packets_per_second": 200.0,

        "packet_asymmetry": 1600.0,

        "average_packet_size": 1000.0,

        "connection_flags": {
            "syn": 10,
            "rst": 6,
            "fin": 0,
            "ack": 20,
            "psh": 5,
        },

        # Ground truth must remain metadata only.
        "ground_truth_label": "DDoS",

        "t": "10:00",
    }


def _paysim_sample() -> dict:
    """
    Minimal normalized PaySim transaction.

    The transaction is intentionally large enough to enter the existing
    transaction/attack-state path.
    """

    return {
        "type": "transaction",
        "stream": "transaction",
        "source": "PaySim",
        "dataset_record_id": "PaySim:test-record-001",

        "amount": 20_000.0,

        "from_account": "C123",
        "to_account": "C900",

        "transaction_type": "TRANSFER",

        "dataset_step": 10,

        # Existing PayShield timeline representation.
        "t": "10",

        # Ground truth is metadata only.
        "ground_truth_fraud": 1,
        "ground_truth_flagged_fraud": 0,
    }


def test_cic_record_reaches_existing_cic_detector_and_correlator():
    """
    Verify:

        CIC normalized record
            ↓
        existing CIC detector
            ↓
        existing correlator
            ↓
        attack state
            ↓
        investigation-compatible case
    """

    graph = EntityGraph()

    result = run_case(
        "REAL-CIC-001",
        [
            _cic_sample(),
        ],
        graph,
        correlated=True,
    )

    assert result["mode"] == "correlated"

    case = result["case"]

    assert case["case_id"] == "REAL-CIC-001"

    assert len(case["evidence"]) == 1

    evidence = case["evidence"][0]

    assert evidence["stream"] == "network"

    assert evidence["source"] == "CIC-IDS2017"

    assert (
        evidence["dataset_record_id"]
        == "CIC-IDS2017:test-record-001"
    )

    assert (
        evidence["ground_truth_label"]
        == "DDoS"
    )

    # The detector must make its decision from the CIC behavioural
    # features. The ground-truth label is only metadata.
    assert evidence["probability"] >= 0.5

    assert (
        case["attack_state"]
        == "CREDENTIAL_ATTACK"
    )

    assert case["timeline"]

    assert any(
        event["event"]
        == "network_anomaly_detected"
        for event in case["timeline"]
    )

    assert any(
        event["event"]
        == "attack_state_transition"
        for event in case["timeline"]
    )


def test_cic_ground_truth_does_not_drive_detection():
    """
    Replace the CIC ground-truth label while keeping all behavioural
    features identical.

    The detection result must remain unchanged because the label is
    not part of classify_cic_flow()'s decision logic.
    """

    graph_a = EntityGraph()
    graph_b = EntityGraph()

    record_a = _cic_sample()

    record_b = _cic_sample()
    record_b["ground_truth_label"] = "BENIGN"

    result_a = run_case(
        "REAL-CIC-LABEL-A",
        [record_a],
        graph_a,
        correlated=True,
    )

    result_b = run_case(
        "REAL-CIC-LABEL-B",
        [record_b],
        graph_b,
        correlated=True,
    )

    evidence_a = result_a["case"]["evidence"][0]
    evidence_b = result_b["case"]["evidence"][0]

    assert (
        evidence_a["probability"]
        == evidence_b["probability"]
    )

    assert (
        evidence_a["matched_pattern"]
        == evidence_b["matched_pattern"]
    )

    assert (
        result_a["case"]["attack_state"]
        == result_b["case"]["attack_state"]
    )

    assert (
        evidence_a["ground_truth_label"]
        == "DDoS"
    )

    assert (
        evidence_b["ground_truth_label"]
        == "BENIGN"
    )


def test_paysim_transaction_reaches_entity_graph_and_correlator():
    """
    Verify:

        PaySim transaction
            ↓
        existing transaction path
            ↓
        EntityGraph
            ↓
        graph evidence
            ↓
        correlator
            ↓
        MONEY_MOVEMENT
            ↓
        Orchestrator
    """

    graph = EntityGraph()

    result = run_case(
        "REAL-PAYSIM-001",
        [
            _paysim_sample(),
        ],
        graph,
        correlated=True,
    )

    assert result["mode"] == "correlated"

    case = result["case"]

    assert case["case_id"] == "REAL-PAYSIM-001"

    assert case["attack_state"] == "MONEY_MOVEMENT"

    assert result["final_action"] == "TRANSACTION_HOLD"

    graph_evidence = [
        evidence
        for evidence in case["evidence"]
        if evidence["stream"]
        == "entity_graph"
    ]

    assert graph_evidence

    evidence = graph_evidence[0]

    assert evidence["source"] == "PaySim"

    assert (
        evidence["dataset_record_id"]
        == "PaySim:test-record-001"
    )

    assert evidence["amount"] == 20_000.0

    assert evidence["to_account"] == "C900"

    assert (
        evidence["ground_truth_fraud"]
        == 1
    )

    assert (
        evidence["ground_truth_flagged_fraud"]
        == 0
    )

    assert case["timeline"]

    assert any(
        event["event"]
        == "large_transaction_initiated"
        for event in case["timeline"]
    )

    assert any(
        event["event"]
        == "attack_state_transition"
        for event in case["timeline"]
    )

    assert any(
        event["event"]
        == "orchestrator_decision"
        for event in case["timeline"]
    )


def test_paysim_ground_truth_does_not_change_transaction_decision():
    """
    The existing transaction path must make its decision from amount
    and EntityGraph analysis, not from isFraud.
    """

    graph_a = EntityGraph()
    graph_b = EntityGraph()

    record_a = _paysim_sample()

    record_b = _paysim_sample()
    record_b["ground_truth_fraud"] = 0
    record_b["ground_truth_flagged_fraud"] = 0

    result_a = run_case(
        "REAL-PAYSIM-LABEL-A",
        [record_a],
        graph_a,
        correlated=True,
    )

    result_b = run_case(
        "REAL-PAYSIM-LABEL-B",
        [record_b],
        graph_b,
        correlated=True,
    )

    assert (
        result_a["case"]["attack_state"]
        == result_b["case"]["attack_state"]
    )

    assert (
        result_a["final_action"]
        == result_b["final_action"]
    )

    evidence_a = [
        evidence
        for evidence in result_a["case"]["evidence"]
        if evidence["stream"]
        == "entity_graph"
    ][0]

    evidence_b = [
        evidence
        for evidence in result_b["case"]["evidence"]
        if evidence["stream"]
        == "entity_graph"
    ][0]

    assert (
        evidence_a["amount"]
        == evidence_b["amount"]
    )

    assert (
        evidence_a["ground_truth_fraud"]
        == 1
    )

    assert (
        evidence_b["ground_truth_fraud"]
        == 0
    )


def test_cic_and_paysim_share_one_payshield_pipeline():
    """
    End-to-end architecture test.

        CIC evidence
             +
        PaySim evidence
             ↓
        existing Correlator
             ↓
        Attack State
             ↓
        Timeline
             ↓
        Orchestrator
             ↓
        Policy
    """

    graph = EntityGraph()

    result = run_case(
        "REAL-END-TO-END-001",
        [
            _cic_sample(),
            _paysim_sample(),
        ],
        graph,
        correlated=True,
    )

    case = result["case"]

    streams = {
        evidence["stream"]
        for evidence in case["evidence"]
    }

    assert "network" in streams

    assert "entity_graph" in streams

    assert (
        case["attack_state"]
        == "MONEY_MOVEMENT"
    )

    assert (
        result["final_action"]
        == "TRANSACTION_HOLD"
    )

    assert len(case["timeline"]) >= 4

    assert any(
        event["event"]
        == "network_anomaly_detected"
        for event in case["timeline"]
    )

    assert any(
        event["event"]
        == "large_transaction_initiated"
        for event in case["timeline"]
    )

    assert any(
        event["event"]
        == "attack_state_transition"
        for event in case["timeline"]
    )

    assert any(
        event["event"]
        == "orchestrator_decision"
        for event in case["timeline"]
    )