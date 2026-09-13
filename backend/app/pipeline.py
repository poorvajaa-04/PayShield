"""
Wires evidence detectors -> entity graph -> correlator -> orchestrator -> explainability
into one callable pipeline, and implements the correlation experiment toggle
(Section 5.1).

Both modes consult the entity graph LIVE for the per-stream enrichment:
  - lure -> identifier_in_confirmed_scam
  - session -> device_linked_to_flagged_account
  - transaction -> compute_mule_signal

Correlated mode fuses evidence through the correlator and orchestrator.
Independent mode keeps each evidence stream as a separate mini-decision.
"""

from __future__ import annotations

from .entity_graph.entity_graph import EntityGraph
from .evidence.lure.detector import classify as classify_lure
from .evidence.network.detector import classify as classify_network
from .evidence.session.detector import classify as classify_session
from .models.case import Case
from .correlator import Correlator
from .orchestrator import Orchestrator


orchestrator = Orchestrator()


def run_case(
    case_id: str,
    script: list[dict],
    graph: EntityGraph,
    correlated: bool = True,
) -> dict:

    case = Case(case_id=case_id)
    correlator = Correlator(case, graph=graph)

    independent_results = []

    for step in script:
        t = step.get("t")
        step_type = step["type"]

        # ---------- LURE ----------

        if step_type == "lure":

            result = classify_lure(
                step["text"],
                case_id=case_id,
            )

            identifier = step.get("identifier")

            if correlated:
                correlator.feed_lure(
                    result,
                    identifier=identifier,
                )

            else:
                graph_hit = (
                    bool(identifier)
                    and graph.identifier_in_confirmed_scam(identifier)
                )

                probability = (
                    min(0.99, result.probability + 0.25)
                    if graph_hit
                    else result.probability
                )

                case.log(
                    "suspicious_message_detected",
                    stream="lure",
                    t=t,
                    probability=probability,
                    matched_pattern=result.matched_pattern,
                    identifier_flagged_by_graph=graph_hit,
                )

                mini_action = (
                    "WARN"
                    if probability >= 0.8
                    else ("MONITOR" if probability >= 0.5 else "NONE")
                )

                independent_results.append(
                    {
                        "stream": "lure",
                        "action": mini_action,
                        "detail": result.matched_pattern,
                    }
                )

        # ---------- NETWORK ----------

        elif step_type == "network":

            result = classify_network(
                step["failed_logins"],
                step["requests_per_minute"],
                step["distinct_source_ips"],
                case_id=case_id,
            )

            if correlated:
                correlator.feed_network(result)

            else:
                case.log(
                    "network_anomaly_detected",
                    stream="network",
                    t=t,
                    probability=result.probability,
                    matched_pattern=result.matched_pattern,
                )

                mini_action = (
                    "STEP_UP_AUTH"
                    if result.probability >= 0.5
                    else "MONITOR"
                )

                independent_results.append(
                    {
                        "stream": "network",
                        "action": mini_action,
                        "detail": result.matched_pattern,
                    }
                )

        # ---------- SESSION ----------

        elif step_type == "session":

            result = classify_session(
                step["is_new_device"],
                step["geo_velocity_kmph"],
                step["login_hour_local"],
                step["remote_access_tool_detected"],
                case_id=case_id,
            )

            device_id = step.get("device_id")

            if correlated:
                correlator.feed_session(
                    result,
                    device_id=device_id,
                )

            else:
                linked = (
                    graph.device_linked_to_flagged_account(device_id)
                    if device_id
                    else []
                )

                anomaly_score = (
                    min(0.99, result.probability + 0.2)
                    if linked
                    else result.probability
                )

                case.log(
                    "session_anomaly_detected",
                    stream="session",
                    t=t,
                    anomaly_score=anomaly_score,
                    triggering_feature=result.matched_pattern,
                    device_linked_to_flagged_accounts=linked,
                )

                mini_action = (
                    "MONITOR"
                    if anomaly_score >= 0.5
                    else "NONE"
                )

                independent_results.append(
                    {
                        "stream": "session",
                        "action": mini_action,
                        "detail": result.matched_pattern,
                    }
                )

        # ---------- TRANSACTION ----------

        elif step_type == "transaction":

            if correlated:

                correlator.feed_transaction(
                    step["amount"],
                    step["from_account"],
                    step["to_account"],
                    timestamp=t,
                )

            else:

                graph.add_transaction_edge(
                    step["from_account"],
                    step["to_account"],
                    step["amount"],
                    t,
                )

                signal = graph.compute_mule_signal(
                    step["to_account"]
                )

                mule_hit = (
                    signal["is_confirmed_mule"]
                    or bool(signal["confirmed_mules_in_community"])
                    or signal["is_structural_hub"]
                )

                case.log(
                    "large_transaction_initiated",
                    stream="entity_graph",
                    t=t,
                    amount=step["amount"],
                    to_account=step["to_account"],
                    **signal,
                )

                mini_action = (
                    "MONITOR"
                    if mule_hit
                    else "NONE"
                )

                independent_results.append(
                    {
                        "stream": "entity_graph",
                        "action": mini_action,
                        "detail": (
                            "mule-ring signal"
                            if mule_hit
                            else "no flag"
                        ),
                    }
                )

                case.add_evidence(
                    "entity_graph",
                    amount=step["amount"],
                    to_account=step["to_account"],
                    **signal,
                )

    # ---------- FINAL DECISION ----------

    if correlated:

        final_action = orchestrator.decide(case)

        from .explainability import generate_explanation

        explanation = generate_explanation(
            case,
            graph,
        )

        return {
            "mode": "correlated",
            "case": case.to_dict(),
            "final_action": final_action,
            "explanation": explanation,
        }

    else:

        return {
            "mode": "independent",
            "case": case.to_dict(),
            "independent_results": independent_results,
            "final_action": "NO ACTION TAKEN (no cross-stream correlation)",
            "explanation": [
                f"{r['stream']}: {r['action']} ({r['detail']})"
                for r in independent_results
            ],
        }