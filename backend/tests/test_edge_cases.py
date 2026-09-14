import pytest

from backend.app.models.case import Case
from backend.app.correlator import Correlator
from backend.app.entity_graph.entity_graph import EntityGraph
from backend.app.pipeline import run_case


def test_empty_case_pipeline():
    graph = EntityGraph()

    result = run_case(
        "EDGE-001",
        [],
        graph,
    )

    assert result["case"]["attack_state"] == "NONE"
    assert result["final_action"] == "MONITOR"
    assert result["case"]["evidence"] == []


def test_unknown_pipeline_step_type_raises_key_error():
    graph = EntityGraph()

    with pytest.raises(KeyError):
        run_case(
            "EDGE-002",
            [{"type": "unknown"}],
            graph,
        )


def test_missing_step_type_raises_key_error():
    graph = EntityGraph()

    with pytest.raises(KeyError):
        run_case(
            "EDGE-003",
            [{"text": "test"}],
            graph,
        )


def test_transaction_exactly_at_threshold_is_notable():
    graph = EntityGraph()
    case = Case(case_id="EDGE-004")
    correlator = Correlator(case, graph=graph)

    correlator.feed_transaction(
        10000,
        "ACC-A",
        "ACC-B",
        "10:00",
    )

    assert case.attack_state == "MONEY_MOVEMENT"


def test_transaction_below_threshold_is_not_notable():
    graph = EntityGraph()
    case = Case(case_id="EDGE-005")
    correlator = Correlator(case, graph=graph)

    correlator.feed_transaction(
        9999.99,
        "ACC-A",
        "ACC-B",
        "10:00",
    )

    assert case.attack_state == "NONE"


def test_unknown_identifier_does_not_create_graph_hit():
    graph = EntityGraph()
    case = Case(case_id="EDGE-006")
    correlator = Correlator(case, graph=graph)

    from backend.app.evidence.lure.detector import classify

    result = classify(
        "Share the OTP.",
        case_id="EDGE-006",
    )

    correlator.feed_lure(
        result,
        identifier="UNKNOWN-PHONE",
    )

    assert case.evidence[0]["identifier_flagged_by_graph"] is False


def test_unknown_device_does_not_create_linked_accounts():
    graph = EntityGraph()
    case = Case(case_id="EDGE-007")
    correlator = Correlator(case, graph=graph)

    from backend.app.evidence.session.detector import classify

    result = classify(
        True,
        10,
        12,
        False,
        case_id="EDGE-007",
    )

    correlator.feed_session(
        result,
        device_id="UNKNOWN-DEVICE",
    )

    assert case.evidence[0]["device_linked_to_flagged_accounts"] == []


def test_confirm_mule_new_account():
    graph = EntityGraph()

    result = graph.confirm_mule("NEW-MULE")

    assert result["outcome"] == "confirmed"
    assert graph.g.nodes["NEW-MULE"]["confirmed_mule"] is True
    assert graph.g.nodes["NEW-MULE"]["risk_tier"] == 3


def test_dismiss_new_account():
    graph = EntityGraph()

    result = graph.dismiss_mule(
        "NEW-ACCOUNT",
        reason="legitimate",
    )

    assert result["outcome"] == "dismissed"
    assert graph.g.nodes["NEW-ACCOUNT"]["dismissed"] is True
    assert graph.g.nodes["NEW-ACCOUNT"]["confirmed_mule"] is False


def test_case_multiple_evidence_entries():
    case = Case(case_id="EDGE-008")

    case.add_evidence("lure", probability=0.8)
    case.add_evidence("network", probability=0.7)
    case.add_evidence("session", anomaly_score=0.9)

    assert len(case.evidence) == 3


def test_state_never_regresses_after_multiple_events():
    graph = EntityGraph()
    case = Case(case_id="EDGE-009")
    correlator = Correlator(case, graph=graph)

    from backend.app.evidence.network.detector import classify as network_classify
    from backend.app.evidence.lure.detector import classify as lure_classify

    network = network_classify(
        9,
        40,
        6,
        case_id=case.case_id,
    )

    correlator.feed_network(network)

    state_after_network = case.attack_state

    lure = lure_classify(
        "Hello.",
        case_id=case.case_id,
    )

    correlator.feed_lure(lure)

    assert case.attack_state == state_after_network


def test_duplicate_device_link_does_not_crash():
    graph = EntityGraph()

    graph.add_shared_device_link(
        "ACC-001",
        "DEV-001",
    )

    graph.add_shared_device_link(
        "ACC-001",
        "DEV-001",
    )

    assert graph.g.has_edge("ACC-001", "DEV-001")


def test_duplicate_identifier_link_does_not_crash():
    graph = EntityGraph()

    graph.add_shared_identifier_link(
        "ACC-001",
        "9876500000",
        "phone",
    )

    graph.add_shared_identifier_link(
        "ACC-001",
        "9876500000",
        "phone",
    )

    assert graph.g.has_edge("ACC-001", "9876500000")