from backend.app.models.case import Case
from backend.app.orchestrator import Orchestrator


def decide(state, evidence=None):
    case = Case(
        case_id="ORCH-TEST",
        attack_state=state,
        evidence=evidence or [],
    )

    return Orchestrator().decide(case), case


def test_none_state_monitors():
    action, _ = decide("NONE")

    assert action == "MONITOR"


def test_lure_detected_with_high_confidence_warns():
    action, _ = decide(
        "LURE_DETECTED",
        [
            {
                "stream": "lure",
                "probability": 0.85,
            }
        ],
    )

    assert action == "WARN"


def test_lure_detected_with_lower_confidence_monitors():
    action, _ = decide(
        "LURE_DETECTED",
        [
            {
                "stream": "lure",
                "probability": 0.60,
            }
        ],
    )

    assert action == "MONITOR"


def test_credential_attack_steps_up_auth():
    action, _ = decide("CREDENTIAL_ATTACK")

    assert action == "STEP_UP_AUTH"


def test_money_movement_holds_transaction():
    action, _ = decide("MONEY_MOVEMENT")

    assert action == "TRANSACTION_HOLD"


def test_account_takeover_with_one_evidence_does_not_hold():
    action, _ = decide(
        "ACCOUNT_TAKEOVER",
        [
            {
                "stream": "session",
                "probability": 0.9,
            }
        ],
    )

    assert action == "MONITOR"


def test_account_takeover_with_two_evidence_holds():
    action, _ = decide(
        "ACCOUNT_TAKEOVER",
        [
            {
                "stream": "lure",
                "probability": 0.9,
            },
            {
                "stream": "session",
                "anomaly_score": 0.9,
            },
        ],
    )

    assert action == "TRANSACTION_HOLD"


def test_confirmed_mule_kill_switch():
    action, _ = decide(
        "MONEY_MOVEMENT",
        [
            {
                "stream": "entity_graph",
                "is_confirmed_mule": True,
                "confirmed_mules_in_community": [],
            }
        ],
    )

    assert action == "KILL_SWITCH"


def test_confirmed_mule_community_kill_switch():
    action, _ = decide(
        "MONEY_MOVEMENT",
        [
            {
                "stream": "entity_graph",
                "is_confirmed_mule": False,
                "confirmed_mules_in_community": ["ACC-MULE-9"],
            }
        ],
    )

    assert action == "KILL_SWITCH"


def test_mule_transfer_confirmed_kill_switch():
    action, _ = decide("MULE_TRANSFER_CONFIRMED")

    assert action == "KILL_SWITCH"


def test_structural_hub_holds_instead_of_killing():
    action, _ = decide(
        "MONEY_MOVEMENT",
        [
            {
                "stream": "entity_graph",
                "is_confirmed_mule": False,
                "confirmed_mules_in_community": [],
                "is_structural_hub": True,
            }
        ],
    )

    assert action == "TRANSACTION_HOLD"


def test_decision_is_written_to_case():
    action, case = decide("CREDENTIAL_ATTACK")

    assert action == "STEP_UP_AUTH"
    assert case.final_action == "STEP_UP_AUTH"
    assert case.timeline[-1].event == "orchestrator_decision"