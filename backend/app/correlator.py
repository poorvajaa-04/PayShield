"""
Cross-Stage Correlator — Section 3.3.

Takes evidence from all four streams (lure, network, session, entity_graph)
and produces a single ATTACK STATE, never a score.

The state machine only advances forward within a case window — it never
regresses.

The transition history written into the case's timeline is the temporal
case model.

This correlator also wires the entity graph into the stages that require it:

    - feed_lure(...)
        Checks whether the phone/VPA is associated with a confirmed scam.

    - feed_session(...)
        Checks whether the device is already linked to a flagged account.

    - feed_transaction(...)
        Runs PageRank, betweenness and Louvain-based mule-ring analysis.

Important:
    The correlator determines WHAT IS HAPPENING.

    The orchestrator determines WHAT POLICY ACTION SHOULD BE RECOMMENDED.

The two responsibilities remain separate.
"""

from __future__ import annotations

from typing import Optional

from .models.case import Case
from .entity_graph.entity_graph import EntityGraph


# =====================================================================
# ATTACK-STATE MACHINE
# =====================================================================

ATTACK_STATES = [
    "NONE",
    "LURE_DETECTED",
    "CREDENTIAL_ATTACK",
    "ACCOUNT_TAKEOVER",
    "MONEY_MOVEMENT",
    "MULE_TRANSFER_CONFIRMED",
]

STATE_RANK = {
    state: index
    for index, state in enumerate(ATTACK_STATES)
}


# =====================================================================
# TRANSACTION THRESHOLD
# =====================================================================

LARGE_TX_THRESHOLD = 10_000


# =====================================================================
# CORRELATOR
# =====================================================================

class Correlator:
    """
    One Correlator instance represents one open PayShield case.

    Evidence is fed into the correlator through the feed_* methods.

    Each method:

        1. evaluates the evidence
        2. records evidence on the Case
        3. records a timeline event
        4. may advance the attack state

    The attack state only moves forward.
    """

    def __init__(
        self,
        case: Case,
        graph: Optional[EntityGraph] = None,
    ):
        self.case = case
        self.graph = graph

    # =================================================================
    # STATE TRANSITION
    # =================================================================

    def _maybe_advance(
        self,
        candidate_state: str,
        reason: str,
        stream: str,
        t: Optional[str] = None,
        **extra,
    ):
        """
        Advance the attack state only when the candidate state is more
        advanced than the current state.

        `t` is the timestamp belonging to the evidence that caused the
        transition.

        This is important because the timeline must represent the
        chronological case, rather than the server's current clock time.
        """

        current_state = self.case.attack_state

        current_rank = STATE_RANK[current_state]
        candidate_rank = STATE_RANK[candidate_state]

        if candidate_rank > current_rank:

            previous = current_state

            self.case.attack_state = candidate_state

            self.case.log(
                "attack_state_transition",
                stream=stream,
                t=t,
                from_state=previous,
                to=candidate_state,
                reason=reason,
                **extra,
            )

            return True

        return False

    # =================================================================
    # STAGE 1 — LURE
    # =================================================================

    def feed_lure(
        self,
        lure_result,
        identifier: Optional[str] = None,
        t: Optional[str] = None,
    ):
        """
        Process lure/message evidence.

        The detector determines whether the message resembles a coercion
        or OTP-harvesting pattern.

        If an identifier is supplied and the entity graph already knows
        that identifier from a confirmed scam account, the evidence is
        strengthened.

        The correlator then determines whether the case enters
        LURE_DETECTED.
        """

        probability = lure_result.probability
        matched_pattern = lure_result.matched_pattern

        graph_hit = False

        # -------------------------------------------------------------
        # Entity-graph enrichment
        # -------------------------------------------------------------

        if identifier and self.graph is not None:

            graph_hit = (
                self.graph.identifier_in_confirmed_scam(identifier)
            )

            if graph_hit:

                probability = min(
                    0.99,
                    probability + 0.25,
                )

                matched_pattern = (
                    matched_pattern
                    or "coercion pattern"
                ) + (
                    " + sender identifier matches a confirmed prior scam"
                )

        # -------------------------------------------------------------
        # Timeline
        # -------------------------------------------------------------

        self.case.log(
            "suspicious_message_detected",
            stream="lure",
            t=t,
            probability=probability,
            matched_pattern=matched_pattern,
            identifier_flagged_by_graph=graph_hit,
        )

        # -------------------------------------------------------------
        # Evidence
        # -------------------------------------------------------------

        self.case.add_evidence(
            "lure",
            probability=probability,
            matched_pattern=matched_pattern,
            identifier_flagged_by_graph=graph_hit,
        )

        # -------------------------------------------------------------
        # State transition
        # -------------------------------------------------------------

        if probability >= 0.5:

            self._maybe_advance(
                "LURE_DETECTED",
                (
                    f"lure probability {probability} "
                    f"({matched_pattern})"
                ),
                "lure",
                t=t,
            )

    # =================================================================
    # STAGE 2 — NETWORK
    # =================================================================

    def feed_network(
        self,
        net_result,
        t: Optional[str] = None,
    ):
        """
        Process network anomaly evidence.

        The network detector produces the probability and matched pattern.

        The correlator uses that evidence to determine whether the case
        progresses to CREDENTIAL_ATTACK.
        """

        # -------------------------------------------------------------
        # Timeline
        # -------------------------------------------------------------

        self.case.log(
            "network_anomaly_detected",
            stream="network",
            t=t,
            probability=net_result.probability,
            matched_pattern=net_result.matched_pattern,
        )

        # -------------------------------------------------------------
        # Evidence
        # -------------------------------------------------------------

        self.case.add_evidence(
            "network",
            probability=net_result.probability,
            matched_pattern=net_result.matched_pattern,
        )

        # -------------------------------------------------------------
        # State transition
        # -------------------------------------------------------------

        if net_result.probability >= 0.5:

            self._maybe_advance(
                "CREDENTIAL_ATTACK",
                (
                    f"network intrusion probability "
                    f"{net_result.probability} "
                    f"({net_result.matched_pattern})"
                ),
                "network",
                t=t,
            )

    # =================================================================
    # STAGE 3 — SESSION
    # =================================================================

    def feed_session(
        self,
        session_result,
        device_id: Optional[str] = None,
        t: Optional[str] = None,
    ):
        """
        Process suspicious session/login evidence.

        The entity graph is checked to determine whether the device is
        already associated with a flagged account.
        """

        anomaly_score = session_result.probability
        triggering_feature = session_result.matched_pattern

        linked_flagged_accounts = []

        # -------------------------------------------------------------
        # Entity-graph enrichment
        # -------------------------------------------------------------

        if device_id and self.graph is not None:

            linked_flagged_accounts = (
                self.graph.device_linked_to_flagged_account(
                    device_id
                )
            )

            if linked_flagged_accounts:

                anomaly_score = min(
                    0.99,
                    anomaly_score + 0.2,
                )

                triggering_feature = (
                    triggering_feature
                    or "session anomaly"
                ) + (
                    " + device previously linked to flagged "
                    f"account(s) {linked_flagged_accounts}"
                )

        # -------------------------------------------------------------
        # Timeline
        # -------------------------------------------------------------

        self.case.log(
            "session_anomaly_detected",
            stream="session",
            t=t,
            anomaly_score=anomaly_score,
            triggering_feature=triggering_feature,
            device_linked_to_flagged_accounts=(
                linked_flagged_accounts
            ),
        )

        # -------------------------------------------------------------
        # Evidence
        # -------------------------------------------------------------

        self.case.add_evidence(
            "session",
            anomaly_score=anomaly_score,
            triggering_feature=triggering_feature,
            device_linked_to_flagged_accounts=(
                linked_flagged_accounts
            ),
        )

        # -------------------------------------------------------------
        # State transition
        # -------------------------------------------------------------

        if anomaly_score >= 0.7:

            target = (
                "ACCOUNT_TAKEOVER"
                if self.case.attack_state != "NONE"
                else "CREDENTIAL_ATTACK"
            )

            self._maybe_advance(
                target,
                (
                    f"session anomaly score {anomaly_score} "
                    f"({triggering_feature})"
                ),
                "session",
                t=t,
            )

    # =================================================================
    # STAGE 4 — TRANSACTION / ENTITY GRAPH
    # =================================================================

    def feed_transaction(
        self,
        amount: float,
        from_account: str,
        to_account: str,
        timestamp: str = "",
    ):
        """
        Process transaction evidence.

        The transaction is first written into the entity graph.

        The graph then performs its actual analytics:

            - PageRank
            - betweenness centrality
            - Louvain community detection
            - confirmed-mule lookup
            - structural-hub detection

        The correlator reacts to those results.

        No mule/community decision is supplied by the caller.
        """

        # -------------------------------------------------------------
        # Update entity graph
        # -------------------------------------------------------------

        if self.graph is not None:

            self.graph.add_transaction_edge(
                from_account,
                to_account,
                amount,
                timestamp,
            )

            signal = self.graph.compute_mule_signal(
                to_account
            )

        else:

            signal = {
                "is_confirmed_mule": False,
                "community_id": None,
                "confirmed_mules_in_community": [],
                "is_structural_hub": False,
                "pagerank": 0.0,
                "betweenness": 0.0,
            }

        # -------------------------------------------------------------
        # Determine whether transaction is notable
        # -------------------------------------------------------------

        is_flagged_recipient = (
            signal["is_confirmed_mule"]
            or bool(
                signal["confirmed_mules_in_community"]
            )
            or signal["is_structural_hub"]
        )

        is_notable = (
            amount >= LARGE_TX_THRESHOLD
            or is_flagged_recipient
        )

        # -------------------------------------------------------------
        # Ordinary transaction
        # -------------------------------------------------------------

        if not is_notable:

            self.case.log(
                "transaction_initiated",
                stream="entity_graph",
                t=timestamp or None,
                amount=amount,
                to_account=to_account,
            )

            return

        # -------------------------------------------------------------
        # Notable transaction
        # -------------------------------------------------------------

        self.case.log(
            "large_transaction_initiated",
            stream="entity_graph",
            t=timestamp or None,
            amount=amount,
            to_account=to_account,
        )

        # -------------------------------------------------------------
        # Evidence
        # -------------------------------------------------------------

        self.case.add_evidence(
            "entity_graph",
            amount=amount,
            to_account=to_account,
            is_confirmed_mule=signal["is_confirmed_mule"],
            community_id=signal["community_id"],
            confirmed_mules_in_community=(
                signal["confirmed_mules_in_community"]
            ),
            is_structural_hub=signal["is_structural_hub"],
            pagerank=signal["pagerank"],
            betweenness=signal["betweenness"],
        )

        # -------------------------------------------------------------
        # Money movement
        # -------------------------------------------------------------

        self._maybe_advance(
            "MONEY_MOVEMENT",
            (
                f"transaction of {amount} initiated "
                f"to {to_account}"
            ),
            "entity_graph",
            t=timestamp or None,
        )

        # -------------------------------------------------------------
        # Community signal
        # -------------------------------------------------------------

        if signal["confirmed_mules_in_community"]:

            self.case.log(
                "recipient_in_mule_community",
                stream="entity_graph",
                t=timestamp or None,
                community_id=signal["community_id"],
                confirmed_mules_in_community=(
                    signal["confirmed_mules_in_community"]
                ),
            )

        # -------------------------------------------------------------
        # Structural hub signal
        # -------------------------------------------------------------

        if (
            signal["is_structural_hub"]
            and not signal["is_confirmed_mule"]
        ):

            self.case.log(
                "recipient_flagged_as_structural_hub",
                stream="entity_graph",
                t=timestamp or None,
                pagerank=signal["pagerank"],
                betweenness=signal["betweenness"],
            )

        # -------------------------------------------------------------
        # Confirmed mule transfer
        # -------------------------------------------------------------

        if (
            signal["is_confirmed_mule"]
            or signal["confirmed_mules_in_community"]
        ):

            self._maybe_advance(
                "MULE_TRANSFER_CONFIRMED",
                (
                    f"recipient {to_account} is "
                    "confirmed-mule or shares a community "
                    "with confirmed mule(s) "
                    f"{signal['confirmed_mules_in_community']}"
                ),
                "entity_graph",
                t=timestamp or None,
                community_id=signal["community_id"],
            )

        # -------------------------------------------------------------
        # Structurally suspicious recipient
        # -------------------------------------------------------------

        elif signal["is_structural_hub"]:

            self.case.log(
                "recipient_structurally_suspicious_pending_confirmation",
                stream="entity_graph",
                t=timestamp or None,
                pagerank=signal["pagerank"],
                betweenness=signal["betweenness"],
            )