"""
PayShield Entity Graph.

Architecture role
-----------------
The EntityGraph is the shared evidence structure used by:

    Stage 1  -> lure / identifier evidence
    Stage 3  -> device/session linkage
    Stage 4  -> transaction / mule-ring analysis
    Investigation API -> graph visualization and explainability

Node types:
    - account
    - device
    - phone
    - vpa

Relationship types:
    - transaction
    - device_link
    - phone_link
    - vpa_link

Important prototype behaviour
-----------------------------
The graph stores accounts and relationships returned by the actual
PayShield evidence pipeline.

For the current CIC-IDS2017 + PaySim prototype, the real PaySim
transaction data primarily produces account-to-account transaction
relationships. Therefore the graph may legitimately contain:

    30 accounts
    25 transaction relationships
    0 phones
    0 devices

The visualization layer must render what the backend actually returns
rather than inventing additional entities.

Persistence
-----------
An in-memory NetworkX graph is used during case execution.

SQLite persistence is retained as the prototype persistence layer.
Neo4j remains the intended production-scale upgrade path.
"""

from __future__ import annotations

import json
import sqlite3
from typing import Optional

import community as community_louvain
import networkx as nx


# ---------------------------------------------------------------------
# Mule-ring threshold
# ---------------------------------------------------------------------
#
# An account is considered a structural hub when either PageRank or
# betweenness is a sufficiently large outlier compared with the
# current account graph.
#
# This is a graph-derived signal, NOT a confirmed mule determination.
# ---------------------------------------------------------------------

HUB_CENTRALITY_MULTIPLIER = 2.5


class EntityGraph:
    """
    Shared PayShield entity relationship graph.

    The internal NetworkX graph remains undirected because the graph
    algorithms used for the prototype operate on the account topology.

    Directional transaction bookkeeping is maintained separately through
    _incoming and _outgoing so that:

        sender -> recipient

    is never lost.
    """

    def __init__(self):
        self.g = nx.Graph()

        # Directional transaction bookkeeping.
        #
        # account -> set(accounts it sent to)
        self._outgoing: dict[str, set[str]] = {}

        # account -> set(accounts it received from)
        self._incoming: dict[str, set[str]] = {}

        # Earliest observed timestamp for an entity.
        self._first_seen: dict[str, str] = {}

    # =================================================================
    # CONSTRUCTION
    # =================================================================

    def add_account(self, account_id: str, **attrs):
        """
        Add an account entity if it does not already exist.

        Existing attributes are preserved unless explicitly supplied.
        """

        if not self.g.has_node(account_id):
            self.g.add_node(
                account_id,
                kind="account",
                confirmed_mule=False,
                dismissed=False,
                risk_tier=0,
                **attrs,
            )
        else:
            # Update supplied attributes without destroying existing state.
            if attrs:
                self.g.nodes[account_id].update(attrs)

        return account_id

    def add_device(self, device_id: str):
        """Add a device entity."""
        if not self.g.has_node(device_id):
            self.g.add_node(
                device_id,
                kind="device",
            )

        return device_id

    def add_shared_identifier_link(
        self,
        account_id: str,
        identifier: str,
        kind: str,
    ):
        """
        Link an account to a phone or VPA identifier.

        kind must be:

            phone
            vpa
        """

        if kind not in {"phone", "vpa"}:
            raise ValueError(
                f"Unsupported identifier kind: {kind}"
            )

        self.add_account(account_id)

        if not self.g.has_node(identifier):
            self.g.add_node(
                identifier,
                kind=kind,
            )

        self.g.add_edge(
            account_id,
            identifier,
            kind=f"{kind}_link",
        )

        return identifier

    def add_shared_device_link(
        self,
        account_id: str,
        device_id: str,
    ):
        """Create an account -> device relationship."""

        self.add_account(account_id)
        self.add_device(device_id)

        self.g.add_edge(
            account_id,
            device_id,
            kind="device_link",
        )

        return device_id

    def add_transaction_edge(
        self,
        from_account: str,
        to_account: str,
        amount: float,
        timestamp: str,
    ):
        """
        Add or aggregate a transaction relationship.

        The NetworkX graph stores one relationship per unique
        account pair, while tx_count and tx_amount aggregate repeated
        transactions between the same accounts.

        Direction is preserved separately through _incoming/_outgoing.
        """

        self.add_account(from_account)
        self.add_account(to_account)

        if self.g.has_edge(from_account, to_account):

            edge = self.g[from_account][to_account]

            # Do not allow a non-transaction relationship to be silently
            # converted into a transaction relationship.
            if edge.get("kind") != "transaction":
                raise ValueError(
                    "Conflicting relationship already exists between "
                    f"{from_account} and {to_account}"
                )

            edge["tx_count"] = edge.get("tx_count", 0) + 1
            edge["tx_amount"] = (
                edge.get("tx_amount", 0.0) + float(amount)
            )

            # Keep the latest transaction timestamp.
            previous_timestamp = edge.get("last_ts")

            if (
                previous_timestamp is None
                or str(timestamp) > str(previous_timestamp)
            ):
                edge["last_ts"] = timestamp

        else:
            self.g.add_edge(
                from_account,
                to_account,
                kind="transaction",
                tx_count=1,
                tx_amount=float(amount),
                last_ts=timestamp,
            )

        # Preserve transaction direction.
        self._outgoing.setdefault(
            from_account,
            set(),
        ).add(to_account)

        self._incoming.setdefault(
            to_account,
            set(),
        ).add(from_account)

        # Preserve earliest observation.
        self._first_seen.setdefault(
            from_account,
            timestamp,
        )

        self._first_seen.setdefault(
            to_account,
            timestamp,
        )

    # =================================================================
    # ACCOUNT TRANSACTION SUBGRAPH
    # =================================================================

    def account_subgraph(self) -> nx.Graph:
        """
        Return the transaction-only account graph.

        Only account nodes and transaction relationships are included.
        """

        accounts = [
            node
            for node, data in self.g.nodes(data=True)
            if data.get("kind") == "account"
        ]

        sub = self.g.subgraph(accounts).copy()

        transaction_edges = [
            (u, v)
            for u, v, data in sub.edges(data=True)
            if data.get("kind") == "transaction"
        ]

        if not transaction_edges:
            return nx.Graph()

        return sub.edge_subgraph(
            transaction_edges
        ).copy()

    # =================================================================
    # GRAPH ANALYTICS
    # =================================================================

    def pagerank(self) -> dict:
        """
        Calculate PageRank over the transaction-only account graph.
        """

        sub = self.account_subgraph()

        if sub.number_of_nodes() == 0:
            return {}

        return nx.pagerank(
            sub,
            weight="tx_amount",
        )

    def betweenness(self) -> dict:
        """
        Calculate betweenness centrality over the transaction graph.
        """

        sub = self.account_subgraph()

        if sub.number_of_nodes() < 2:
            return {
                node: 0.0
                for node in sub.nodes()
            }

        return nx.betweenness_centrality(
            sub,
        )

    def communities(self) -> dict:
        """
        Calculate Louvain communities over the transaction graph.

        Returns:

            {
                account_id: community_id
            }
        """

        sub = self.account_subgraph()

        if sub.number_of_nodes() == 0:
            return {}

        if sub.number_of_edges() == 0:
            return {
                node: index
                for index, node in enumerate(sub.nodes())
            }

        return community_louvain.best_partition(
            sub
        )

    def community_of(
        self,
        account_id: str,
    ) -> Optional[int]:
        """Return the Louvain community containing an account."""

        return self.communities().get(
            account_id
        )

    def community_members(
        self,
        community_id: int,
    ) -> list:
        """Return accounts belonging to a community."""

        if community_id is None:
            return []

        partitions = self.communities()

        return [
            account
            for account, cid in partitions.items()
            if cid == community_id
        ]

    def confirmed_mules_in_community(
        self,
        community_id: int,
    ) -> list:
        """Return confirmed mule accounts in a community."""

        if community_id is None:
            return []

        members = self.community_members(
            community_id
        )

        return [
            account
            for account in members
            if self.g.nodes[account].get(
                "confirmed_mule",
                False,
            )
        ]

    # =================================================================
    # STAGE 4 — MULE SIGNAL
    # =================================================================

    def compute_mule_signal(
        self,
        account_id: str,
    ) -> dict:
        """
        Compute graph-derived mule evidence for an account.

        Signals:

        - confirmed mule
        - Louvain community
        - confirmed mules in same community
        - PageRank
        - betweenness
        - structural-hub status

        Structural hub status is an analytical signal only.
        It does not mean the account has been confirmed as a mule.
        """

        if (
            not self.g.has_node(account_id)
            or self.g.nodes[account_id].get("kind")
            != "account"
        ):
            return {
                "is_confirmed_mule": False,
                "community_id": None,
                "confirmed_mules_in_community": [],
                "is_structural_hub": False,
                "pagerank": 0.0,
                "betweenness": 0.0,
            }

        is_confirmed = bool(
            self.g.nodes[account_id].get(
                "confirmed_mule",
                False,
            )
        )

        community_id = self.community_of(
            account_id
        )

        confirmed_in_community = (
            self.confirmed_mules_in_community(
                community_id
            )
        )

        confirmed_in_community = [
            account
            for account in confirmed_in_community
            if account != account_id
        ]

        pr = self.pagerank()
        bw = self.betweenness()

        pr_score = pr.get(
            account_id,
            0.0,
        )

        bw_score = bw.get(
            account_id,
            0.0,
        )

        avg_pr = (
            sum(pr.values()) / len(pr)
            if pr
            else 0.0
        )

        avg_bw = (
            sum(bw.values()) / len(bw)
            if bw
            else 0.0
        )

        is_hub = (
            (
                avg_pr > 0
                and pr_score
                >= HUB_CENTRALITY_MULTIPLIER * avg_pr
            )
            or
            (
                avg_bw > 0
                and bw_score
                >= HUB_CENTRALITY_MULTIPLIER * avg_bw
            )
        )

        return {
            "is_confirmed_mule": is_confirmed,
            "community_id": community_id,
            "confirmed_mules_in_community": confirmed_in_community,
            "is_structural_hub": is_hub,
            "pagerank": round(
                pr_score,
                4,
            ),
            "betweenness": round(
                bw_score,
                4,
            ),
        }

    # =================================================================
    # STAGE 3 — DEVICE LINKAGE
    # =================================================================

    def device_linked_to_flagged_account(
        self,
        device_id: str,
    ) -> list:
        """
        Return accounts connected to a device that currently have
        elevated risk.
        """

        if not self.g.has_node(device_id):
            return []

        flagged = []

        for neighbor in self.g.neighbors(
            device_id
        ):
            if (
                self.g.nodes[neighbor].get("kind")
                == "account"
                and self.g.nodes[neighbor].get(
                    "risk_tier",
                    0,
                ) > 0
            ):
                flagged.append(neighbor)

        return flagged

    # =================================================================
    # STAGE 1 — IDENTIFIER LINKAGE
    # =================================================================

    def identifier_in_confirmed_scam(
        self,
        identifier: str,
    ) -> bool:
        """
        Check whether a phone/VPA identifier is linked to a confirmed
        mule account.
        """

        if not self.g.has_node(identifier):
            return False

        for neighbor in self.g.neighbors(
            identifier
        ):
            if (
                self.g.nodes[neighbor].get("kind")
                == "account"
                and self.g.nodes[neighbor].get(
                    "confirmed_mule",
                    False,
                )
            ):
                return True

        return False

    # =================================================================
    # HUMAN REVIEW — CONFIRM MULE
    # =================================================================

    def confirm_mule(
        self,
        account_id: str,
    ) -> dict:
        """
        Mark an account as a confirmed mule.

        Risk is propagated to accounts that directly sent money to the
        newly confirmed account.
        """

        self.add_account(
            account_id
        )

        self.g.nodes[account_id][
            "confirmed_mule"
        ] = True

        self.g.nodes[account_id][
            "dismissed"
        ] = False

        self.g.nodes[account_id][
            "risk_tier"
        ] = max(
            self.g.nodes[account_id].get(
                "risk_tier",
                0,
            ),
            3,
        )

        affected = []

        for neighbor in self.g.neighbors(
            account_id
        ):
            if (
                self.g.nodes[neighbor].get(
                    "kind"
                )
                != "account"
            ):
                continue

            edge = self.g[
                account_id
            ][neighbor]

            if edge.get(
                "kind"
            ) != "transaction":
                continue

            before = self.g.nodes[
                neighbor
            ].get(
                "risk_tier",
                0,
            )

            after = before + 1

            self.g.nodes[
                neighbor
            ]["risk_tier"] = after

            affected.append(
                {
                    "account": neighbor,
                    "risk_tier_before": before,
                    "risk_tier_after": after,
                    "reason": (
                        "received funds from "
                        "newly-confirmed mule account "
                        f"{account_id}"
                    ),
                }
            )

        return {
            "outcome": "confirmed",
            "confirmed_mule": account_id,
            "propagated_to": affected,
        }

    # =================================================================
    # HUMAN REVIEW — DISMISS MULE
    # =================================================================

    def dismiss_mule(
        self,
        account_id: str,
        reason: str = "",
    ) -> dict:
        """
        Mark an account as reviewed and dismissed.

        This is deliberately different from simply leaving an account
        untouched because the action becomes auditable.
        """

        self.add_account(
            account_id
        )

        self.g.nodes[account_id][
            "dismissed"
        ] = True

        self.g.nodes[account_id][
            "confirmed_mule"
        ] = False

        return {
            "outcome": "dismissed",
            "account": account_id,
            "reason": reason,
        }

    # =================================================================
    # EVIDENCE HELPERS
    # =================================================================

    def fan_in_fan_out(
        self,
        account_id: str,
    ) -> dict:
        """
        Return unique incoming and outgoing counterpart counts.
        """

        return {
            "incoming": len(
                self._incoming.get(
                    account_id,
                    set(),
                )
            ),
            "outgoing": len(
                self._outgoing.get(
                    account_id,
                    set(),
                )
            ),
        }

    def register_dormancy(
        self,
        account_id: str,
        dormant_days: int,
    ):
        """
        Register a dormancy observation for explainability.
        """

        self.add_account(
            account_id
        )

        self.g.nodes[account_id][
            "dormant_days"
        ] = dormant_days

    def register_pass_through(
        self,
        account_id: str,
        pct_forwarded: float,
        minutes: int,
    ):
        """
        Register a pass-through observation for explainability.
        """

        self.add_account(
            account_id
        )

        self.g.nodes[account_id][
            "pass_through_pct"
        ] = pct_forwarded

        self.g.nodes[account_id][
            "pass_through_minutes"
        ] = minutes

    # =================================================================
    # VISUALIZATION SERIALIZATION
    # =================================================================

    def to_viz_dict(self) -> dict:
        """
        Return a frontend-safe representation of the complete graph.

        Important:
        NetworkX internally uses an undirected graph for topology and
        centrality calculations. Therefore transaction edge direction
        must NOT be inferred from NetworkX's arbitrary u/v ordering.

        Instead, transaction direction is reconstructed from the
        explicit _outgoing bookkeeping.

        Output:

            {
                "nodes": [...],
                "edges": [...]
            }

        Every actual graph node is returned.

        Every actual graph relationship is returned.

        No artificial transaction nodes are created here.
        """

        # -------------------------------------------------------------
        # NODES
        # -------------------------------------------------------------

        nodes = []

        for node_id, data in self.g.nodes(
            data=True
        ):
            node = {
                "id": node_id,
                **data,
            }

            # Keep the earliest known timestamp available to the
            # investigation frontend when one exists.
            if node_id in self._first_seen:
                node["first_seen"] = (
                    self._first_seen[node_id]
                )

            nodes.append(node)

        # Stable ordering makes the frontend deterministic.
        nodes.sort(
            key=lambda node: (
                str(node.get("kind", "")),
                str(node.get("id", "")),
            )
        )

        # -------------------------------------------------------------
        # EDGES
        # -------------------------------------------------------------

        edges = []
        seen_transaction_pairs = set()

        # Transaction relationships.
        #
        # Use _outgoing to preserve sender -> recipient direction.
        for source, targets in self._outgoing.items():

            for target in targets:

                if not self.g.has_edge(
                    source,
                    target,
                ):
                    continue

                data = self.g[
                    source
                ][target]

                if data.get(
                    "kind"
                ) != "transaction":
                    continue

                pair = (
                    source,
                    target,
                )

                if pair in seen_transaction_pairs:
                    continue

                seen_transaction_pairs.add(
                    pair
                )

                edges.append(
                    {
                        "source": source,
                        "target": target,
                        "kind": "transaction",
                        "tx_count": data.get(
                            "tx_count",
                            0,
                        ),
                        "tx_amount": data.get(
                            "tx_amount",
                            0.0,
                        ),
                        "last_ts": data.get(
                            "last_ts"
                        ),
                    }
                )

        # Non-transaction relationships.
        #
        # These are undirected structural links such as:
        #
        # account <-> device
        # account <-> phone
        # account <-> VPA
        #
        for source, target, data in self.g.edges(
            data=True
        ):
            if data.get(
                "kind"
            ) == "transaction":
                continue

            edges.append(
                {
                    "source": source,
                    "target": target,
                    **data,
                }
            )

        # Stable edge ordering.
        edges.sort(
            key=lambda edge: (
                str(edge.get("kind", "")),
                str(edge.get("source", "")),
                str(edge.get("target", "")),
            )
        )

        return {
            "nodes": nodes,
            "edges": edges,
        }

    # =================================================================
    # SQLITE PERSISTENCE
    # =================================================================

    def save_to_sqlite(
        self,
        path: str,
    ):
        """
        Persist nodes and relationships to SQLite.

        This stores the graph topology and attributes used by the
        prototype. Directional transaction bookkeeping is reconstructed
        when loading transaction edges.
        """

        conn = sqlite3.connect(
            path
        )

        try:
            cur = conn.cursor()

            cur.execute(
                "DROP TABLE IF EXISTS nodes"
            )

            cur.execute(
                "DROP TABLE IF EXISTS edges"
            )

            cur.execute(
                """
                CREATE TABLE nodes (
                    id TEXT PRIMARY KEY,
                    attrs TEXT
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE edges (
                    source TEXT,
                    target TEXT,
                    attrs TEXT
                )
                """
            )

            for node_id, data in self.g.nodes(
                data=True
            ):
                cur.execute(
                    "INSERT INTO nodes VALUES (?, ?)",
                    (
                        node_id,
                        json.dumps(
                            data
                        ),
                    ),
                )

            for source, target, data in self.g.edges(
                data=True
            ):
                cur.execute(
                    "INSERT INTO edges VALUES (?, ?, ?)",
                    (
                        source,
                        target,
                        json.dumps(
                            data
                        ),
                    ),
                )

            conn.commit()

        finally:
            conn.close()

    # =================================================================
    # SQLITE LOAD
    # =================================================================

    @classmethod
    def load_from_sqlite(
        cls,
        path: str,
    ) -> "EntityGraph":
        """
        Load an EntityGraph from SQLite.

        Transaction direction is reconstructed from stored transaction
        edges. Because the current persistence format stores the graph
        as an undirected NetworkX edge list, this assumes the stored
        source/target orientation represents the original transaction
        direction.
        """

        graph = cls()

        conn = sqlite3.connect(
            path
        )

        try:
            cur = conn.cursor()

            cur.execute(
                "SELECT id, attrs FROM nodes"
            )

            for node_id, attrs_json in cur.fetchall():

                attrs = json.loads(
                    attrs_json
                )

                graph.g.add_node(
                    node_id,
                    **attrs,
                )

                if "first_seen" in attrs:
                    graph._first_seen[
                        node_id
                    ] = attrs["first_seen"]

            cur.execute(
                "SELECT source, target, attrs FROM edges"
            )

            for source, target, attrs_json in cur.fetchall():

                attrs = json.loads(
                    attrs_json
                )

                graph.g.add_edge(
                    source,
                    target,
                    **attrs,
                )

                if attrs.get(
                    "kind"
                ) == "transaction":

                    graph._outgoing.setdefault(
                        source,
                        set(),
                    ).add(target)

                    graph._incoming.setdefault(
                        target,
                        set(),
                    ).add(source)

                    last_ts = attrs.get(
                        "last_ts"
                    )

                    if last_ts is not None:
                        graph._first_seen.setdefault(
                            source,
                            last_ts,
                        )

                        graph._first_seen.setdefault(
                            target,
                            last_ts,
                        )

        finally:
            conn.close()

        return graph