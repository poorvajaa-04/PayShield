"""
Entity Graph — Section 3.2 of the architecture doc.

Nodes: accounts, devices, phone numbers, VPAs
Edges: transactions, shared-device links, shared-VPA/number links

This single structure backs three things, and — unlike an earlier draft of this
codebase — all three are now actually CALLED by the live decision pipeline,
not just implemented and left unused:
  - Stage 4 mule-ring detection (PageRank, betweenness, Louvain community
    detection) -> compute_mule_signal(), called from Correlator.feed_transaction
  - Stage 3 session risk (does this device already link to a flagged account?)
    -> device_linked_to_flagged_account(), called from Correlator.feed_session
  - Stage 1 lure risk (has this phone/VPA appeared in a confirmed scam script?)
    -> identifier_in_confirmed_scam(), called from Correlator.feed_lure

Persistence: an in-memory NetworkX graph, with save_to_sqlite()/load_from_sqlite()
for the edge-list persistence named in the architecture doc as the prototype's
persistence layer (Neo4j is the named production upgrade path, out of scope here).
"""

from __future__ import annotations
import json
import sqlite3
import networkx as nx
import community as community_louvain  # python-louvain
from typing import Optional

# A recipient counts as a "ring hub" (Stage 4 signal) if its PageRank or
# betweenness centrality is this many times the graph's average — i.e. it's a
# clear structural outlier — even before any account in its community has been
# manually confirmed as a mule. This is what lets the system flag a *new*,
# not-yet-confirmed mule ring based on graph shape alone.
HUB_CENTRALITY_MULTIPLIER = 2.5


class EntityGraph:
    def __init__(self):
        self.g = nx.Graph()
        # Separate directed bookkeeping for fan-in/fan-out stats (Section 6),
        # since collapsing to an undirected edge loses "who sent to whom".
        self._incoming: dict[str, set] = {}
        self._outgoing: dict[str, set] = {}
        self._first_seen: dict[str, str] = {}

    # ---------- construction ----------

    def add_account(self, account_id: str, **attrs):
        if not self.g.has_node(account_id):
            self.g.add_node(account_id, kind="account", confirmed_mule=False,
                             dismissed=False, risk_tier=0, **attrs)
        return account_id

    def add_device(self, device_id: str):
        if not self.g.has_node(device_id):
            self.g.add_node(device_id, kind="device")
        return device_id

    def add_transaction_edge(self, from_account: str, to_account: str, amount: float,
                              timestamp: str):
        self.add_account(from_account)
        self.add_account(to_account)
        if self.g.has_edge(from_account, to_account):
            self.g[from_account][to_account]["tx_count"] += 1
            self.g[from_account][to_account]["tx_amount"] += amount
        else:
            self.g.add_edge(from_account, to_account, kind="transaction",
                             tx_count=1, tx_amount=amount, last_ts=timestamp)

        self._outgoing.setdefault(from_account, set()).add(to_account)
        self._incoming.setdefault(to_account, set()).add(from_account)
        self._first_seen.setdefault(from_account, timestamp)
        self._first_seen.setdefault(to_account, timestamp)

    def add_shared_device_link(self, account_id: str, device_id: str):
        self.add_account(account_id)
        self.add_device(device_id)
        self.g.add_edge(account_id, device_id, kind="device_link")

    def add_shared_identifier_link(self, account_id: str, identifier: str, kind: str):
        """kind = 'phone' or 'vpa'"""
        self.add_account(account_id)
        if not self.g.has_node(identifier):
            self.g.add_node(identifier, kind=kind)
        self.g.add_edge(account_id, identifier, kind=f"{kind}_link")

    # ---------- Stage 4: mule-ring detection (NOW ACTUALLY CALLED) ----------

    def account_subgraph(self) -> nx.Graph:
        """Transactions-only view (accounts as nodes) for centrality/community work."""
        accounts = [n for n, d in self.g.nodes(data=True) if d.get("kind") == "account"]
        sub = self.g.subgraph(accounts).copy()
        tx_edges = [(u, v) for u, v, d in sub.edges(data=True) if d.get("kind") == "transaction"]
        return sub.edge_subgraph(tx_edges).copy() if tx_edges else nx.Graph()

    def pagerank(self) -> dict:
        sub = self.account_subgraph()
        if sub.number_of_nodes() == 0:
            return {}
        return nx.pagerank(sub, weight="tx_amount")

    def betweenness(self) -> dict:
        sub = self.account_subgraph()
        if sub.number_of_nodes() < 2:
            return {n: 0.0 for n in sub.nodes()}
        return nx.betweenness_centrality(sub)

    def communities(self) -> dict:
        """Louvain community detection over the transaction subgraph.
        Returns {account_id: community_id}."""
        sub = self.account_subgraph()
        if sub.number_of_nodes() == 0:
            return {}
        if sub.number_of_edges() == 0:
            # Louvain needs edges; isolated accounts each get their own community.
            return {n: i for i, n in enumerate(sub.nodes())}
        return community_louvain.best_partition(sub)

    def community_of(self, account_id: str) -> Optional[int]:
        return self.communities().get(account_id)

    def community_members(self, community_id: int) -> list:
        parts = self.communities()
        return [acc for acc, cid in parts.items() if cid == community_id]

    def confirmed_mules_in_community(self, community_id: int) -> list:
        if community_id is None:
            return []
        members = self.community_members(community_id)
        return [m for m in members if self.g.nodes[m].get("confirmed_mule")]

    def compute_mule_signal(self, account_id: str) -> dict:
        """
        THE live replacement for what used to be a hand-typed True/False flag
        in the demo scripts. Called by Correlator.feed_transaction for every
        notable transaction's recipient. Runs the actual graph algorithms named
        in Section 3.2 (PageRank, betweenness, Louvain) against whatever the
        graph currently looks like, and returns:
          - is_confirmed_mule: this exact account was previously confirmed (3.5)
          - community_id: this account's Louvain community in the tx graph
          - confirmed_mules_in_community: list of already-confirmed mules
            sharing that community (i.e. "this money is heading toward a
            known ring", even though this specific account was never confirmed)
          - is_structural_hub: True if this account's PageRank or betweenness
            is a clear outlier vs. the graph average — flags a *brand new*,
            not-yet-confirmed ring based on transaction shape alone (fan-in/
            pass-through structure), which is what makes mule-ring detection
            useful before any human has manually confirmed anything.
        """
        if not self.g.has_node(account_id) or self.g.nodes[account_id].get("kind") != "account":
            return {"is_confirmed_mule": False, "community_id": None,
                     "confirmed_mules_in_community": [], "is_structural_hub": False,
                     "pagerank": 0.0, "betweenness": 0.0}

        is_confirmed = bool(self.g.nodes[account_id].get("confirmed_mule"))
        community_id = self.community_of(account_id)
        confirmed_in_community = self.confirmed_mules_in_community(community_id)
        # Exclude the account itself from that list so it reads as "other
        # confirmed mules nearby", not a tautology when it's confirmed itself.
        confirmed_in_community = [m for m in confirmed_in_community if m != account_id]

        pr = self.pagerank()
        bw = self.betweenness()
        pr_score = pr.get(account_id, 0.0)
        bw_score = bw.get(account_id, 0.0)
        avg_pr = (sum(pr.values()) / len(pr)) if pr else 0.0
        avg_bw = (sum(bw.values()) / len(bw)) if bw else 0.0
        is_hub = (avg_pr > 0 and pr_score >= HUB_CENTRALITY_MULTIPLIER * avg_pr) or \
                 (avg_bw > 0 and bw_score >= HUB_CENTRALITY_MULTIPLIER * avg_bw)

        return {
            "is_confirmed_mule": is_confirmed,
            "community_id": community_id,
            "confirmed_mules_in_community": confirmed_in_community,
            "is_structural_hub": is_hub,
            "pagerank": round(pr_score, 4),
            "betweenness": round(bw_score, 4),
        }

    # ---------- Stage 3: device already linked to a flagged account? (NOW CALLED) ----------

    def device_linked_to_flagged_account(self, device_id: str) -> list:
        if not self.g.has_node(device_id):
            return []
        flagged = []
        for neighbor in self.g.neighbors(device_id):
            if self.g.nodes[neighbor].get("kind") == "account" and \
               self.g.nodes[neighbor].get("risk_tier", 0) > 0:
                flagged.append(neighbor)
        return flagged

    # ---------- Stage 1: has this phone/VPA appeared in a confirmed scam? (NOW CALLED) ----------

    def identifier_in_confirmed_scam(self, identifier: str) -> bool:
        if not self.g.has_node(identifier):
            return False
        for neighbor in self.g.neighbors(identifier):
            if self.g.nodes[neighbor].get("kind") == "account" and \
               self.g.nodes[neighbor].get("confirmed_mule"):
                return True
        return False

    # ---------- Section 3.5: human confirmation / dismissal -> graph update ----------

    def confirm_mule(self, account_id: str) -> dict:
        """Marks an account as a confirmed mule and propagates elevated risk
        to every account with a direct transaction edge to it."""
        self.add_account(account_id)
        self.g.nodes[account_id]["confirmed_mule"] = True
        self.g.nodes[account_id]["dismissed"] = False
        self.g.nodes[account_id]["risk_tier"] = max(self.g.nodes[account_id]["risk_tier"], 3)

        affected = []
        for neighbor in self.g.neighbors(account_id):
            if self.g.nodes[neighbor].get("kind") != "account":
                continue
            if self.g[account_id][neighbor].get("kind") != "transaction":
                continue
            before = self.g.nodes[neighbor]["risk_tier"]
            after = before + 1
            self.g.nodes[neighbor]["risk_tier"] = after
            affected.append({"account": neighbor, "risk_tier_before": before,
                              "risk_tier_after": after,
                              "reason": f"received funds from newly-confirmed mule account {account_id}"})
        return {"outcome": "confirmed", "confirmed_mule": account_id, "propagated_to": affected}

    def dismiss_mule(self, account_id: str, reason: str = "") -> dict:
        """The other half of Section 3.5's 'confirm or dismiss' analyst action.
        Explicitly records that a held/flagged account was reviewed and cleared,
        without propagating any elevated risk. Distinct from simply doing
        nothing, so the decision is auditable."""
        self.add_account(account_id)
        self.g.nodes[account_id]["dismissed"] = True
        self.g.nodes[account_id]["confirmed_mule"] = False
        return {"outcome": "dismissed", "account": account_id, "reason": reason}

    # ---------- stats used by explainability (Section 6) ----------

    def fan_in_fan_out(self, account_id: str) -> dict:
        return {
            "incoming": len(self._incoming.get(account_id, set())),
            "outgoing": len(self._outgoing.get(account_id, set())),
        }

    def register_dormancy(self, account_id: str, dormant_days: int):
        """Sets the 'dormant for N days' fact used in explainability text.
        In production this would be computed from real account-activity
        history; the prototype takes it as a planted fact for the demo
        scenarios, same as a feature store would supply it in production."""
        self.add_account(account_id)
        self.g.nodes[account_id]["dormant_days"] = dormant_days

    def register_pass_through(self, account_id: str, pct_forwarded: float, minutes: int):
        """Sets the 'X% forwarded within Y minutes' pass-through fact used in
        explainability text. Same production note as register_dormancy above."""
        self.add_account(account_id)
        self.g.nodes[account_id]["pass_through_pct"] = pct_forwarded
        self.g.nodes[account_id]["pass_through_minutes"] = minutes

    def to_viz_dict(self) -> dict:
        """Serializable node/edge list for the dashboard graph view."""
        nodes = [{"id": n, **d} for n, d in self.g.nodes(data=True)]
        edges = [{"source": u, "target": v, **d} for u, v, d in self.g.edges(data=True)]
        return {"nodes": nodes, "edges": edges}

    # ---------- persistence: SQLite edge-list (named in the architecture doc) ----------

    def save_to_sqlite(self, path: str):
        """Persists nodes and edges to a SQLite file. This is the prototype
        persistence layer named in Section 3.2 ("edge list persisted to
        SQLite"); Neo4j is the doc's named production upgrade path and is
        out of scope for this prototype."""
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        cur.execute("DROP TABLE IF EXISTS nodes")
        cur.execute("DROP TABLE IF EXISTS edges")
        cur.execute("CREATE TABLE nodes (id TEXT PRIMARY KEY, attrs TEXT)")
        cur.execute("CREATE TABLE edges (source TEXT, target TEXT, attrs TEXT)")
        for n, d in self.g.nodes(data=True):
            cur.execute("INSERT INTO nodes VALUES (?, ?)", (n, json.dumps(d)))
        for u, v, d in self.g.edges(data=True):
            cur.execute("INSERT INTO edges VALUES (?, ?, ?)", (u, v, json.dumps(d)))
        conn.commit()
        conn.close()

    @classmethod
    def load_from_sqlite(cls, path: str) -> "EntityGraph":
        graph = cls()
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        cur.execute("SELECT id, attrs FROM nodes")
        for node_id, attrs_json in cur.fetchall():
            graph.g.add_node(node_id, **json.loads(attrs_json))
        cur.execute("SELECT source, target, attrs FROM edges")
        for u, v, attrs_json in cur.fetchall():
            attrs = json.loads(attrs_json)
            graph.g.add_edge(u, v, **attrs)
            if attrs.get("kind") == "transaction":
                graph._outgoing.setdefault(u, set()).add(v)
                graph._incoming.setdefault(v, set()).add(u)
        conn.close()
        return graph
