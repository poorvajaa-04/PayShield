"""
Cross-Stage Correlator — Section 3.3.

Takes evidence from all four streams (lure, network, session, entity_graph) and
produces a single ATTACK STATE, never a score. The state machine only advances
forward within a case window — it never regresses. The transition history
written into the case's timeline IS the temporal case model (Section 4).

This version wires the entity graph into all three stages the architecture doc
says it should back (Section 3.2), instead of trusting caller-supplied flags:
  - feed_lure(...):        checks identifier_in_confirmed_scam() when a phone/VPA is given
  - feed_session(...):     checks device_linked_to_flagged_account() when a device is given
  - feed_transaction(...): calls graph.compute_mule_signal() — real PageRank/
                            betweenness/Louvain output — instead of a hardcoded
                            recipient_in_mule_community boolean
"""

from __future__ import annotations
from typing import Optional
from .models.case import Case
from .entity_graph.entity_graph import EntityGraph
# Kill-chain progression, in order. Index = severity rank.
ATTACK_STATES = [
    "NONE",
    "LURE_DETECTED",
    "CREDENTIAL_ATTACK",
    "ACCOUNT_TAKEOVER",
    "MONEY_MOVEMENT",
    "MULE_TRANSFER_CONFIRMED",
]

STATE_RANK = {s: i for i, s in enumerate(ATTACK_STATES)}

# A transaction only counts as "money movement" evidence (i.e. worth the
# correlator's attention at all) above this amount, or if the recipient turns
# out to be flagged by the entity graph regardless of size. Ordinary small
# transfers to an unflagged recipient are not attack evidence.
LARGE_TX_THRESHOLD = 10_000


class Correlator:
    """One Correlator per open case. Call feed_* methods as evidence arrives;
    each call may advance case.attack_state and always appends to case.timeline."""

    def __init__(self, case: Case, graph: Optional[EntityGraph] = None):
        self.case = case
        self.graph = graph  # optional: enables live Stage 1/3/4 graph checks

    def _maybe_advance(self, candidate_state: str, reason: str, stream: str, **extra):
        current_rank = STATE_RANK[self.case.attack_state]
        candidate_rank = STATE_RANK[candidate_state]
        if candidate_rank > current_rank:
            previous = self.case.attack_state
            self.case.attack_state = candidate_state
            self.case.log("attack_state_transition", stream=stream,
                           from_state=previous, to=candidate_state, reason=reason, **extra)
            return True
        return False

    # ---------- Stage 1: lure, now with live "known scam identifier" check ----------

    def feed_lure(self, lure_result, identifier: Optional[str] = None):
        probability = lure_result.probability
        matched_pattern = lure_result.matched_pattern
        graph_hit = False

        if identifier and self.graph is not None:
            graph_hit = self.graph.identifier_in_confirmed_scam(identifier)
            if graph_hit:
                # This exact phone/VPA has appeared in a previously confirmed
                # scam — boost the probability and say so explicitly, rather
                # than silently trusting the text classifier alone.
                probability = min(0.99, probability + 0.25)
                matched_pattern = (matched_pattern or "coercion pattern") + \
                                   " + sender identifier matches a confirmed prior scam"

        self.case.log("suspicious_message_detected", stream="lure",
                       probability=probability, matched_pattern=matched_pattern,
                       identifier_flagged_by_graph=graph_hit)
        self.case.add_evidence("lure", probability=probability, matched_pattern=matched_pattern,
                                matched_terms=lure_result.matched_terms,
                                identifier_flagged_by_graph=graph_hit)
        if probability >= 0.5:
            self._maybe_advance("LURE_DETECTED",
                                 f"lure probability {probability} ({matched_pattern})", "lure")

    # ---------- Stage 2: network (unchanged — no entity-graph dependency in the doc) ----------

    def feed_network(self, net_result):
        self.case.log("network_anomaly_detected", stream="network",
                       probability=net_result.probability, attack_type=net_result.attack_type)
        self.case.add_evidence("network", probability=net_result.probability,
                                attack_type=net_result.attack_type, detail=net_result.detail)
        if net_result.probability >= 0.5:
            self._maybe_advance("CREDENTIAL_ATTACK",
                                 f"network intrusion probability {net_result.probability} "
                                 f"({net_result.attack_type})", "network")

    # ---------- Stage 3: session, now with live "device already flagged" check ----------

    def feed_session(self, session_result, device_id: Optional[str] = None):
        anomaly_score = session_result.anomaly_score
        triggering_feature = session_result.triggering_feature
        linked_flagged_accounts = []

        if device_id and self.graph is not None:
            linked_flagged_accounts = self.graph.device_linked_to_flagged_account(device_id)
            if linked_flagged_accounts:
                # This device has already touched a flagged account elsewhere —
                # a brand-new device alone is a soft signal, but a device with
                # a flagged history is much stronger.
                anomaly_score = min(0.99, anomaly_score + 0.2)
                triggering_feature = (triggering_feature or "session anomaly") + \
                    f" + device previously linked to flagged account(s) {linked_flagged_accounts}"

        self.case.log("session_anomaly_detected", stream="session",
                       anomaly_score=anomaly_score, triggering_feature=triggering_feature,
                       device_linked_to_flagged_accounts=linked_flagged_accounts)
        self.case.add_evidence("session", anomaly_score=anomaly_score,
                                triggering_feature=triggering_feature,
                                device_linked_to_flagged_accounts=linked_flagged_accounts)
        if anomaly_score >= 0.7:
            target = "ACCOUNT_TAKEOVER" if self.case.attack_state != "NONE" else "CREDENTIAL_ATTACK"
            self._maybe_advance(target,
                                 f"session anomaly score {anomaly_score} ({triggering_feature})",
                                 "session")

    # ---------- Stage 4: transaction, now driven by REAL graph analytics ----------

    def feed_transaction(self, amount: float, from_account: str, to_account: str,
                          timestamp: str = ""):
        """
        Unlike the earlier version of this method, this no longer accepts
        recipient_in_mule_community / recipient_confirmed_mule / community_id
        as caller-supplied booleans. Instead:
          1. The transaction edge is written into the entity graph.
          2. graph.compute_mule_signal(to_account) is called — this actually
             runs Louvain community detection and PageRank/betweenness against
             the current graph, exactly as Section 3.2 specifies.
          3. The correlator reacts to what that real computation finds.
        """
        if self.graph is not None:
            self.graph.add_transaction_edge(from_account, to_account, amount, timestamp)
            signal = self.graph.compute_mule_signal(to_account)
        else:
            signal = {"is_confirmed_mule": False, "community_id": None,
                      "confirmed_mules_in_community": [], "is_structural_hub": False,
                      "pagerank": 0.0, "betweenness": 0.0}

        is_flagged_recipient = signal["is_confirmed_mule"] or \
            len(signal["confirmed_mules_in_community"]) > 0 or signal["is_structural_hub"]
        is_notable = amount >= LARGE_TX_THRESHOLD or is_flagged_recipient

        if not is_notable:
            self.case.log("transaction_initiated", stream="entity_graph", t=timestamp or None,
                           amount=amount, to_account=to_account)
            return

        self.case.log("large_transaction_initiated", stream="entity_graph", t=timestamp or None,
                       amount=amount, to_account=to_account)
        self.case.add_evidence("entity_graph", amount=amount, to_account=to_account,
                                is_confirmed_mule=signal["is_confirmed_mule"],
                                community_id=signal["community_id"],
                                confirmed_mules_in_community=signal["confirmed_mules_in_community"],
                                is_structural_hub=signal["is_structural_hub"],
                                pagerank=signal["pagerank"], betweenness=signal["betweenness"])
        self._maybe_advance("MONEY_MOVEMENT",
                             f"transaction of {amount} initiated to {to_account}", "entity_graph")

        if signal["confirmed_mules_in_community"]:
            self.case.log("recipient_in_mule_community", stream="entity_graph",
                           community_id=signal["community_id"],
                           confirmed_mules_in_community=signal["confirmed_mules_in_community"])
        if signal["is_structural_hub"] and not signal["is_confirmed_mule"]:
            self.case.log("recipient_flagged_as_structural_hub", stream="entity_graph",
                           pagerank=signal["pagerank"], betweenness=signal["betweenness"])

        if signal["is_confirmed_mule"] or signal["confirmed_mules_in_community"]:
            self._maybe_advance("MULE_TRANSFER_CONFIRMED",
                                 f"recipient {to_account} is confirmed-mule or shares a community "
                                 f"with confirmed mule(s) {signal['confirmed_mules_in_community']}",
                                 "entity_graph", community_id=signal["community_id"])
        elif signal["is_structural_hub"]:
            # Not yet confirmed by a human, but the graph shape alone (fan-in,
            # high betweenness) looks like a pass-through account — advance to
            # MONEY_MOVEMENT-with-suspicion rather than the fully-confirmed
            # state, which the orchestrator treats slightly less severely.
            self.case.log("recipient_structurally_suspicious_pending_confirmation",
                           stream="entity_graph", pagerank=signal["pagerank"])
