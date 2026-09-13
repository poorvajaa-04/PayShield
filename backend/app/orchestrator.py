"""
Response Orchestrator — Section 3.4.

A rule/policy table keyed on attack state plus evidence, cleanly separated from
the correlator: the correlator answers "what is happening", this answers
"what do we do about it". Mirrors the table in the architecture doc, extended
with one refinement the live graph wiring makes possible: a transaction into a
confirmed-mule / confirmed-mule-community recipient escalates straight to
KILL_SWITCH, while a transaction into a merely *structurally suspicious* (high
PageRank/betweenness, not yet human-confirmed) recipient escalates to
TRANSACTION_HOLD instead — the system shouldn't treat unconfirmed graph
suspicion identically to a human-confirmed ring.
"""

from __future__ import annotations
from .models.case import Case

ACTIONS = ["MONITOR", "WARN", "STEP_UP_AUTH", "TRANSACTION_HOLD", "KILL_SWITCH"]


class Orchestrator:
    def decide(self, case: Case) -> str:
        state = case.attack_state
        evidence_count = len(case.evidence)

        lure_evidence = [e for e in case.evidence if e["stream"] == "lure"]
        high_conf_lure = any(e.get("probability", 0) >= 0.8 for e in lure_evidence)

        graph_evidence = [e for e in case.evidence if e["stream"] == "entity_graph"]
        confirmed_mule_hit = any(
            e.get("is_confirmed_mule") or e.get("confirmed_mules_in_community")
            for e in graph_evidence
        )
        structural_hub_only = any(
            e.get("is_structural_hub") and not e.get("is_confirmed_mule")
            and not e.get("confirmed_mules_in_community")
            for e in graph_evidence
        )

        if confirmed_mule_hit and state != "NONE":
            action = "KILL_SWITCH"
        elif state == "MULE_TRANSFER_CONFIRMED":
            action = "KILL_SWITCH"
        elif structural_hub_only and state != "NONE":
            # Graph shape alone looks like a mule pass-through, but no human
            # has confirmed it yet — hold for review rather than kill outright.
            action = "TRANSACTION_HOLD"
        elif state == "MONEY_MOVEMENT":
            action = "TRANSACTION_HOLD"
        elif state == "ACCOUNT_TAKEOVER" and evidence_count >= 2:
            action = "TRANSACTION_HOLD"
        elif state == "CREDENTIAL_ATTACK":
            action = "STEP_UP_AUTH"
        elif state == "LURE_DETECTED" and high_conf_lure:
            action = "WARN"
        elif state == "LURE_DETECTED":
            action = "MONITOR"
        else:
            action = "MONITOR"

        case.final_action = action
        case.log("orchestrator_decision", stream=None, action=action,
                  attack_state=state, evidence_count=evidence_count)
        return action
