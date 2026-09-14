from backend.app.pipeline import run_case
from backend.app.entity_graph.entity_graph import EntityGraph


def test_legitimate_scenario_takes_no_action():
    graph = EntityGraph()

    script = [
        {
            "type": "network",
            "failed_logins": 1,
            "requests_per_minute": 20,
            "distinct_source_ips": 1,
            "t": "10:00",
        },
        {
            "type": "session",
            "is_new_device": False,
            "geo_velocity_kmph": 10,
            "login_hour_local": 12,
            "remote_access_tool_detected": False,
            "t": "10:01",
        },
        {
            "type": "transaction",
            "amount": 100,
            "from_account": "ACC-A",
            "to_account": "ACC-B",
            "t": "10:02",
        },
    ]

    result = run_case(
        "INT-001",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "NONE"
    assert result["final_action"] == "MONITOR"


def test_phishing_only_warns():
    graph = EntityGraph()

    script = [
        {
            "type": "lure",
            "text": (
                "I am from CBI. Share the OTP immediately "
                "or your account will be blocked."
            ),
            "t": "10:00",
        }
    ]

    result = run_case(
        "INT-002",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "LURE_DETECTED"
    assert result["final_action"] == "WARN"


def test_account_takeover_flow():
    graph = EntityGraph()

    script = [
        {
            "type": "lure",
            "text": "Share the OTP immediately.",
            "t": "10:00",
        },
        {
            "type": "session",
            "is_new_device": False,
            "geo_velocity_kmph": 1000,
            "login_hour_local": 12,
            "remote_access_tool_detected": False,
            "t": "10:02",
        },
    ]

    result = run_case(
        "INT-003",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "ACCOUNT_TAKEOVER"
    assert result["final_action"] == "TRANSACTION_HOLD"


def test_confirmed_mule_transfer_kills():
    graph = EntityGraph()

    graph.confirm_mule("ACC-MULE")

    script = [
        {
            "type": "lure",
            "text": "Share the OTP immediately.",
            "t": "10:00",
        },
        {
            "type": "transaction",
            "amount": 50000,
            "from_account": "ACC-VICTIM",
            "to_account": "ACC-MULE",
            "t": "10:05",
        },
    ]

    result = run_case(
        "INT-004",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "MULE_TRANSFER_CONFIRMED"
    assert result["final_action"] == "KILL_SWITCH"


def test_full_multi_stage_flow():
    graph = EntityGraph()

    graph.add_shared_identifier_link(
        "ACC-MULE",
        "9876500000",
        "phone",
    )

    graph.confirm_mule("ACC-MULE")

    graph.add_shared_device_link(
        "ACC-MULE",
        "DEV-MULE",
    )

    script = [
        {
            "type": "lure",
            "text": (
                "I am from CBI. Share the OTP immediately "
                "or your account will be blocked."
            ),
            "identifier": "9876500000",
            "t": "10:00",
        },
        {
            "type": "network",
            "failed_logins": 9,
            "requests_per_minute": 40,
            "distinct_source_ips": 6,
            "t": "10:02",
        },
        {
            "type": "session",
            "is_new_device": True,
            "geo_velocity_kmph": 1000,
            "login_hour_local": 12,
            "remote_access_tool_detected": False,
            "device_id": "DEV-MULE",
            "t": "10:04",
        },
        {
            "type": "transaction",
            "amount": 50000,
            "from_account": "ACC-VICTIM",
            "to_account": "ACC-MULE",
            "t": "10:06",
        },
    ]

    result = run_case(
        "INT-005",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "MULE_TRANSFER_CONFIRMED"
    assert result["final_action"] == "KILL_SWITCH"

    assert len(result["case"]["evidence"]) == 4


def test_correlated_and_independent_modes_differ():
    graph1 = EntityGraph()

    script = [
        {
            "type": "lure",
            "text": "Share the OTP immediately.",
            "t": "10:00",
        },
        {
            "type": "network",
            "failed_logins": 9,
            "requests_per_minute": 40,
            "distinct_source_ips": 6,
            "t": "10:02",
        },
        {
            "type": "transaction",
            "amount": 20000,
            "from_account": "ACC-A",
            "to_account": "ACC-B",
            "t": "10:04",
        },
    ]

    correlated = run_case(
        "INT-006-C",
        script,
        graph1,
        correlated=True,
    )

    graph2 = EntityGraph()

    independent = run_case(
        "INT-006-I",
        script,
        graph2,
        correlated=False,
    )

    assert correlated["final_action"] != independent["final_action"]
    assert correlated["final_action"] == "TRANSACTION_HOLD"
    assert independent["final_action"] == (
        "NO ACTION TAKEN (no cross-stream correlation)"
    )


def test_graph_evidence_is_generated_for_large_transaction():
    graph = EntityGraph()

    result = run_case(
        "INT-007",
        [
            {
                "type": "transaction",
                "amount": 20000,
                "from_account": "ACC-A",
                "to_account": "ACC-B",
                "t": "10:00",
            }
        ],
        graph,
        correlated=True,
    )

    evidence = [
        e
        for e in result["case"]["evidence"]
        if e["stream"] == "entity_graph"
    ]

    assert len(evidence) == 1
    assert evidence[0]["amount"] == 20000
    assert evidence[0]["to_account"] == "ACC-B"