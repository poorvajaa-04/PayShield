"""
Evidence-based explainability — Section 6.

Every displayed reason must trace to a concrete computed value from one of the
four evidence streams or the entity graph. Never "AI flagged this as suspicious".
Now reads the live graph-signal fields the correlator computes (community
membership, PageRank, betweenness, structural-hub flag) instead of caller-
supplied booleans.
"""

from __future__ import annotations
from .models.case import Case
from .entity_graph.entity_graph import EntityGraph

def generate_explanation(case: Case, graph: EntityGraph) -> list[str]:
    lines = []
    n = 1

    for e in case.evidence:
        if e["stream"] == "lure" and e.get("matched_pattern"):
            lines.append(f"{n}. Message matched a known coercion pattern: "
                         f"'{e['matched_pattern']}' (lure probability {e['probability']})")
            n += 1
            if e.get("identifier_flagged_by_graph"):
                lines.append(f"{n}. Sender phone/VPA has appeared in a previously confirmed scam case")
                n += 1

        elif e["stream"] == "network" and e.get("attack_type"):
            lines.append(f"{n}. Login traffic matched a known intrusion pattern: "
                         f"{e['attack_type']} — {e.get('detail', '')} "
                         f"(intrusion probability {e['probability']})")
            n += 1

        elif e["stream"] == "session" and e.get("triggering_feature"):
            lines.append(f"{n}. Session anomaly: {e['triggering_feature']} "
                         f"(anomaly score {e['anomaly_score']})")
            n += 1
            if e.get("device_linked_to_flagged_accounts"):
                lines.append(f"{n}. This device was previously linked to flagged account(s): "
                             f"{', '.join(e['device_linked_to_flagged_accounts'])}")
                n += 1

        elif e["stream"] == "entity_graph":
            to_account = e.get("to_account")
            if to_account and graph.g.has_node(to_account):
                fan = graph.fan_in_fan_out(to_account)
                node = graph.g.nodes[to_account]
                lines.append(f"{n}. Receiving account has {fan['incoming']} incoming, "
                             f"{fan['outgoing']} outgoing transactions prior to this transfer "
                             f"(fan-in anomaly)")
                n += 1

                if node.get("pass_through_pct"):
                    lines.append(f"{n}. {node['pass_through_pct']:.0f}% of funds received by this "
                                 f"account are forwarded within {node.get('pass_through_minutes', '?')} "
                                 f"minutes (pass-through pattern)")
                    n += 1

                if node.get("dormant_days"):
                    lines.append(f"{n}. Account was dormant for {node['dormant_days']} days "
                                 f"before this activity began")
                    n += 1

                community_id = e.get("community_id")
                if community_id is not None:
                    lines.append(f"{n}. Louvain community detection places this account in "
                                 f"graph community #{community_id}")
                    n += 1

                confirmed = e.get("confirmed_mules_in_community") or []
                if confirmed:
                    lines.append(f"{n}. Community #{community_id} already contains "
                                 f"{len(confirmed)} previously confirmed mule account(s): "
                                 f"{', '.join(confirmed)}")
                    n += 1

                if e.get("is_confirmed_mule"):
                    lines.append(f"{n}. This exact account is a previously confirmed mule account")
                    n += 1

                if e.get("is_structural_hub"):
                    lines.append(f"{n}. Graph centrality analysis flags this account as a "
                                 f"structural hub (PageRank {e.get('pagerank')}, betweenness "
                                 f"{e.get('betweenness')}) — consistent with a pass-through "
                                 f"account, even before human confirmation")
                    n += 1

    if not lines:
        lines.append("No stage produced a specific flagged feature; activity is within "
                     "normal bounds across all evidence streams.")

    return lines
