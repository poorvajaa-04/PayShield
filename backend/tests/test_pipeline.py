from backend.app.pipeline import run_case
from backend.app.entity_graph.entity_graph import EntityGraph


def test_pipeline_returns_correlated_result():
    graph = EntityGraph()

    script = [
        {
            "type": "lure",
            "text": "Share the OTP immediately.",
            "t": "10:00",
        }
    ]

    result = run_case(
        "PIPE-001",
        script,
        graph,
        correlated=True,
    )

    assert result["mode"] == "correlated"
    assert "case" in result
    assert "final_action" in result
    assert "explanation" in result


def test_pipeline_lure_case():
    graph = EntityGraph()

    script = [
        {
            "type": "lure",
            "text": "I am from CBI. Share the OTP immediately.",
            "t": "10:00",
        }
    ]

    result = run_case(
        "PIPE-002",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "LURE_DETECTED"
    assert result["final_action"] == "WARN"


def test_pipeline_network_case():
    graph = EntityGraph()

    script = [
        {
            "type": "network",
            "failed_logins": 9,
            "requests_per_minute": 40,
            "distinct_source_ips": 6,
            "t": "10:00",
        }
    ]

    result = run_case(
        "PIPE-003",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "CREDENTIAL_ATTACK"
    assert result["final_action"] == "STEP_UP_AUTH"


def test_pipeline_small_transaction_is_ignored_as_attack_evidence():
    graph = EntityGraph()

    script = [
        {
            "type": "transaction",
            "amount": 100,
            "from_account": "ACC-A",
            "to_account": "ACC-B",
            "t": "10:00",
        }
    ]

    result = run_case(
        "PIPE-004",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "NONE"
    assert result["final_action"] == "MONITOR"


def test_pipeline_large_transaction_requires_hold():
    graph = EntityGraph()

    script = [
        {
            "type": "transaction",
            "amount": 20000,
            "from_account": "ACC-A",
            "to_account": "ACC-B",
            "t": "10:00",
        }
    ]

    result = run_case(
        "PIPE-005",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "MONEY_MOVEMENT"
    assert result["final_action"] == "TRANSACTION_HOLD"


def test_pipeline_independent_mode():
    graph = EntityGraph()

    script = [
        {
            "type": "lure",
            "text": "Share the OTP immediately.",
            "t": "10:00",
        }
    ]

    result = run_case(
        "PIPE-006",
        script,
        graph,
        correlated=False,
    )

    assert result["mode"] == "independent"
    assert "independent_results" in result
    assert result["final_action"] == (
        "NO ACTION TAKEN (no cross-stream correlation)"
    )


def test_pipeline_records_case_id():
    graph = EntityGraph()

    result = run_case(
        "PIPE-007",
        [],
        graph,
        correlated=True,
    )

    assert result["case"]["case_id"] == "PIPE-007"


def test_pipeline_processes_multiple_streams():
    graph = EntityGraph()

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
    ]

    result = run_case(
        "PIPE-008",
        script,
        graph,
        correlated=True,
    )

    assert result["case"]["attack_state"] == "CREDENTIAL_ATTACK"
    assert result["final_action"] == "STEP_UP_AUTH"
    assert len(result["case"]["evidence"]) == 2