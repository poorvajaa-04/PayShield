"""
Evidence-based explainability — Section 6.

Every displayed reason must trace to a concrete computed value from one of
the four evidence streams or the entity graph.

The explanation layer does not perform detection or policy decisions.

It only translates evidence already produced by the detectors, correlator,
and entity graph into human-readable investigation reasons.
"""

from __future__ import annotations

from .models.case import Case
from .entity_graph.entity_graph import EntityGraph


def generate_explanation(
    case: Case,
    graph: EntityGraph,
) -> list[str]:
    """
    Generate evidence-backed explanations for the final investigation.

    Important:
        - Ground-truth labels from CIC-IDS2017 and PaySim are NOT used
          as explanations.
        - Explanations are based only on detector output and graph signals.
        - No new detection logic is performed here.
    """

    lines: list[str] = []
    number = 1

    for evidence in case.evidence:

        stream = evidence.get("stream")

        # ==============================================================
        # LURE
        # ==============================================================

        if stream == "lure":

            matched_pattern = evidence.get(
                "matched_pattern"
            )

            probability = evidence.get(
                "probability"
            )

            if matched_pattern:

                lines.append(
                    f"{number}. Message matched a known coercion "
                    f"pattern: '{matched_pattern}' "
                    f"(lure probability {probability})"
                )

                number += 1

            elif probability is not None:

                lines.append(
                    f"{number}. Message produced a lure probability "
                    f"of {probability}"
                )

                number += 1

            if evidence.get(
                "identifier_flagged_by_graph"
            ):

                lines.append(
                    f"{number}. Sender phone/VPA has appeared in a "
                    f"previously confirmed scam case"
                )

                number += 1

        # ==============================================================
        # NETWORK
        # ==============================================================

        elif stream == "network":

            matched_pattern = evidence.get(
                "matched_pattern"
            )

            probability = evidence.get(
                "probability"
            )

            source = evidence.get(
                "source",
                "network detector",
            )

            if matched_pattern:

                lines.append(
                    f"{number}. Network traffic produced a "
                    f"{source} anomaly: '{matched_pattern}' "
                    f"(intrusion probability {probability})"
                )

                number += 1

            elif probability is not None:

                lines.append(
                    f"{number}. Network traffic produced an "
                    f"intrusion probability of {probability}"
                )

                number += 1

            # ----------------------------------------------------------
            # CIC-IDS2017 concrete feature evidence
            # ----------------------------------------------------------

            if evidence.get("source") == "CIC-IDS2017":

                destination_port = evidence.get(
                    "destination_port"
                )

                flow_duration = evidence.get(
                    "flow_duration"
                )

                total_packets = evidence.get(
                    "total_packets"
                )

                total_bytes = evidence.get(
                    "total_bytes"
                )

                packet_rate = evidence.get(
                    "flow_packets_per_second"
                )

                byte_rate = evidence.get(
                    "flow_bytes_per_second"
                )

                packet_asymmetry = evidence.get(
                    "packet_asymmetry"
                )

                if destination_port is not None:

                    lines.append(
                        f"{number}. CIC-IDS2017 flow targeted "
                        f"destination port {destination_port}"
                    )

                    number += 1

                if flow_duration is not None:

                    lines.append(
                        f"{number}. Flow duration was "
                        f"{flow_duration}"
                    )

                    number += 1

                if total_packets is not None:

                    lines.append(
                        f"{number}. Flow contained "
                        f"{total_packets:.0f} total packets"
                    )

                    number += 1

                if total_bytes is not None:

                    lines.append(
                        f"{number}. Flow contained "
                        f"{total_bytes:.0f} total bytes"
                    )

                    number += 1

                if packet_rate is not None:

                    lines.append(
                        f"{number}. Flow packet rate was "
                        f"{packet_rate:.2f} packets/s"
                    )

                    number += 1

                if byte_rate is not None:

                    lines.append(
                        f"{number}. Flow byte rate was "
                        f"{byte_rate:.2f} bytes/s"
                    )

                    number += 1

                if packet_asymmetry is not None:

                    lines.append(
                        f"{number}. Forward/backward packet "
                        f"asymmetry was {packet_asymmetry:.0f} packets"
                    )

                    number += 1

                flags = evidence.get(
                    "connection_flags"
                )

                if flags:

                    active_flags = [
                        f"{name.upper()}={value}"
                        for name, value in flags.items()
                        if value
                    ]

                    if active_flags:

                        lines.append(
                            f"{number}. Connection flags: "
                            + ", ".join(active_flags)
                        )

                        number += 1

        # ==============================================================
        # SESSION
        # ==============================================================

        elif stream == "session":

            triggering_feature = evidence.get(
                "triggering_feature"
            )

            anomaly_score = evidence.get(
                "anomaly_score"
            )

            if triggering_feature:

                lines.append(
                    f"{number}. Session anomaly: "
                    f"{triggering_feature} "
                    f"(anomaly score {anomaly_score})"
                )

                number += 1

            elif anomaly_score is not None:

                lines.append(
                    f"{number}. Session produced an anomaly "
                    f"score of {anomaly_score}"
                )

                number += 1

            linked_accounts = evidence.get(
                "device_linked_to_flagged_accounts"
            ) or []

            if linked_accounts:

                lines.append(
                    f"{number}. This device was previously linked "
                    f"to flagged account(s): "
                    f"{', '.join(linked_accounts)}"
                )

                number += 1

        # ==============================================================
        # ENTITY GRAPH / TRANSACTION
        # ==============================================================

        elif stream == "entity_graph":

            to_account = evidence.get(
                "to_account"
            )

            # ----------------------------------------------------------
            # Transaction itself
            # ----------------------------------------------------------

            amount = evidence.get(
                "amount"
            )

            if amount is not None:

                lines.append(
                    f"{number}. Transaction of "
                    f"{amount:.2f} was sent to "
                    f"{to_account}"
                )

                number += 1

            # ----------------------------------------------------------
            # Graph-level account analysis
            # ----------------------------------------------------------

            if (
                to_account
                and graph.g.has_node(to_account)
            ):

                fan = graph.fan_in_fan_out(
                    to_account
                )

                lines.append(
                    f"{number}. Receiving account has "
                    f"{fan['incoming']} incoming and "
                    f"{fan['outgoing']} outgoing transactions "
                    f"(fan-in/fan-out analysis)"
                )

                number += 1

                node = graph.g.nodes[
                    to_account
                ]

                pass_through_pct = node.get(
                    "pass_through_pct"
                )

                if pass_through_pct:

                    lines.append(
                        f"{number}. {pass_through_pct:.0f}% "
                        f"of funds received by this account are "
                        f"forwarded within "
                        f"{node.get('pass_through_minutes', '?')} "
                        f"minutes (pass-through pattern)"
                    )

                    number += 1

                dormant_days = node.get(
                    "dormant_days"
                )

                if dormant_days:

                    lines.append(
                        f"{number}. Account was dormant for "
                        f"{dormant_days} days before this activity "
                        f"began"
                    )

                    number += 1

            # ----------------------------------------------------------
            # Louvain community
            # ----------------------------------------------------------

            community_id = evidence.get(
                "community_id"
            )

            if community_id is not None:

                lines.append(
                    f"{number}. Louvain community detection places "
                    f"this account in graph community "
                    f"#{community_id}"
                )

                number += 1

            # ----------------------------------------------------------
            # Confirmed mule community
            # ----------------------------------------------------------

            confirmed = evidence.get(
                "confirmed_mules_in_community"
            ) or []

            if confirmed:

                lines.append(
                    f"{number}. Community #{community_id} already "
                    f"contains {len(confirmed)} previously confirmed "
                    f"mule account(s): "
                    f"{', '.join(confirmed)}"
                )

                number += 1

            # ----------------------------------------------------------
            # Exact confirmed mule
            # ----------------------------------------------------------

            if evidence.get(
                "is_confirmed_mule"
            ):

                lines.append(
                    f"{number}. This exact account is a previously "
                    f"confirmed mule account"
                )

                number += 1

            # ----------------------------------------------------------
            # Structural hub
            # ----------------------------------------------------------

            if evidence.get(
                "is_structural_hub"
            ):

                pagerank = evidence.get(
                    "pagerank"
                )

                betweenness = evidence.get(
                    "betweenness"
                )

                lines.append(
                    f"{number}. Graph centrality analysis flags "
                    f"this account as a structural hub "
                    f"(PageRank {pagerank}, "
                    f"betweenness {betweenness}) — consistent "
                    f"with a pass-through account, even before "
                    f"human confirmation"
                )

                number += 1

    # ==============================================================
    # FALLBACK
    # ==============================================================

    if not lines:

        lines.append(
            "No stage produced a specific flagged feature; "
            "activity is within normal bounds across all evidence streams."
        )

    return lines