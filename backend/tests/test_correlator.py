from backend.app.models.case import Case
from backend.app.correlator import Correlator, STATE_RANK
from backend.app.evidence.lure.detector import classify as classify_lure
from backend.app.evidence.network.detector import classify as classify_network
from backend.app.evidence.session.detector import classify as classify_session
from backend.app.entity_graph.entity_graph import EntityGraph


def test_lure_advances_to_lure_detected():
    case = Case(case_id="CORR-001")
    correlator = Correlator(case)

    result = classify_lure(
        "Share the OTP immediately.",
        case_id=case.case_id,
    )

    correlator.feed_lure(result)

    assert case.attack_state == "LURE_DETECTED"


def test_low_probability_lure_does_not_advance():
    case = Case(case_id="CORR-002")
    correlator = Correlator(case)

    result = classify_lure(
        "Hello there.",
        case_id=case.case_id,
    )

    correlator.feed_lure(result)

    assert case.attack_state == "NONE"


def test_network_advances_to_credential_attack():
    case = Case(case_id="CORR-003")
    correlator = Correlator(case)

    result = classify_network(
        failed_logins=9,
        requests_per_minute=40,
        distinct_source_ips=6,
        case_id=case.case_id,
    )

    correlator.feed_network(result)

    assert case.attack_state == "CREDENTIAL_ATTACK"


def test_session_after_lure_advances_to_account_takeover():
    case = Case(case_id="CORR-004")
    correlator = Correlator(case)

    lure = classify_lure(
        "Share the OTP immediately.",
        case_id=case.case_id,
    )

    session = classify_session(
        is_new_device=False,
        geo_velocity_kmph=1000,
        login_hour_local=12,
        remote_access_tool_detected=False,
        case_id=case.case_id,
    )

    correlator.feed_lure(lure)
    correlator.feed_session(session)

    assert case.attack_state == "ACCOUNT_TAKEOVER"


def test_session_from_none_becomes_credential_attack():
    case = Case(case_id="CORR-005")
    correlator = Correlator(case)

    session = classify_session(
        is_new_device=False,
        geo_velocity_kmph=1000,
        login_hour_local=12,
        remote_access_tool_detected=False,
        case_id=case.case_id,
    )

    correlator.feed_session(session)

    assert case.attack_state == "CREDENTIAL_ATTACK"


def test_large_transaction_advances_to_money_movement():
    case = Case(case_id="CORR-006")
    graph = EntityGraph()
    correlator = Correlator(case, graph=graph)

    correlator.feed_transaction(
        20000,
        "ACC-A",
        "ACC-B",
        "10:00",
    )

    assert case.attack_state == "MONEY_MOVEMENT"


def test_small_unflagged_transaction_does_not_create_evidence():
    case = Case(case_id="CORR-007")
    graph = EntityGraph()
    correlator = Correlator(case, graph=graph)

    correlator.feed_transaction(
        100,
        "ACC-A",
        "ACC-B",
        "10:00",
    )

    assert case.attack_state == "NONE"
    assert case.evidence == []


def test_confirmed_mule_transaction_advances_to_mule_transfer():
    case = Case(case_id="CORR-008")
    graph = EntityGraph()

    graph.add_account("ACC-MULE")
    graph.confirm_mule("ACC-MULE")

    correlator = Correlator(case, graph=graph)

    correlator.feed_transaction(
        100,
        "ACC-SENDER",
        "ACC-MULE",
        "10:00",
    )

    assert case.attack_state == "MULE_TRANSFER_CONFIRMED"


def test_graph_identifier_hit_boosts_lure():
    case = Case(case_id="CORR-009")
    graph = EntityGraph()

    graph.add_shared_identifier_link(
        "ACC-SCAM",
        "9876500000",
        "phone",
    )
    graph.confirm_mule("ACC-SCAM")

    correlator = Correlator(case, graph=graph)

    result = classify_lure(
        "Share the OTP.",
        case_id=case.case_id,
    )

    correlator.feed_lure(
        result,
        identifier="9876500000",
    )

    evidence = case.evidence[0]

    assert evidence["identifier_flagged_by_graph"] is True
    assert evidence["probability"] > result.probability


def test_device_flagged_history_boosts_session():
    case = Case(case_id="CORR-010")
    graph = EntityGraph()

    graph.add_shared_device_link(
        "ACC-FLAGGED",
        "DEV-001",
    )
    graph.g.nodes["ACC-FLAGGED"]["risk_tier"] = 2

    correlator = Correlator(case, graph=graph)

    result = classify_session(
        is_new_device=True,
        geo_velocity_kmph=10,
        login_hour_local=12,
        remote_access_tool_detected=False,
        case_id=case.case_id,
    )

    correlator.feed_session(
        result,
        device_id="DEV-001",
    )

    evidence = case.evidence[0]

    assert evidence["device_linked_to_flagged_accounts"] == ["ACC-FLAGGED"]
    assert evidence["anomaly_score"] > result.probability


def test_state_machine_never_regresses():
    case = Case(case_id="CORR-011")
    correlator = Correlator(case)

    network = classify_network(
        failed_logins=9,
        requests_per_minute=40,
        distinct_source_ips=6,
        case_id=case.case_id,
    )

    correlator.feed_network(network)

    high_water_mark = case.attack_state

    lure = classify_lure(
        "Hello.",
        case_id=case.case_id,
    )

    correlator.feed_lure(lure)

    assert STATE_RANK[case.attack_state] >= STATE_RANK[high_water_mark]


def test_correlator_records_timeline():
    case = Case(case_id="CORR-012")
    correlator = Correlator(case)

    result = classify_lure(
        "Share the OTP immediately.",
        case_id=case.case_id,
    )

    correlator.feed_lure(result)

    assert len(case.timeline) >= 2
    assert case.timeline[0].event == "suspicious_message_detected"
    assert case.timeline[1].event == "attack_state_transition"