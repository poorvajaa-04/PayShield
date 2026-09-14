"""
PaySim -> PayShield Entity Graph experiment.

Builds a transaction graph from real PaySim data and performs
graph analysis once for the complete graph.
"""

from __future__ import annotations

from collections import Counter

from .paysim_adapter import iter_paysim
from ..entity_graph.entity_graph import EntityGraph


def build_paysim_graph(
    transaction_limit: int = 5000,
    fraud_only: bool = False,
) -> tuple[EntityGraph, Counter]:

    graph = EntityGraph()
    recipient_counts: Counter = Counter()

    transaction_count = 0

    for transaction in iter_paysim(fraud_only=fraud_only):

        graph.add_transaction_edge(
            from_account=transaction["from_account"],
            to_account=transaction["to_account"],
            amount=transaction["amount"],
            timestamp=str(transaction["step"]),
        )

        recipient_counts[transaction["to_account"]] += 1
        transaction_count += 1

        if transaction_count >= transaction_limit:
            break

    return graph, recipient_counts


def run_experiment(
    transaction_limit: int = 5000,
    fraud_only: bool = False,
) -> None:

    graph, recipient_counts = build_paysim_graph(
        transaction_limit=transaction_limit,
        fraud_only=fraud_only,
    )

    print("=== PaySim Entity Graph Experiment ===")
    print(f"Transactions: {sum(recipient_counts.values())}")
    print(f"Graph nodes: {graph.g.number_of_nodes()}")
    print(f"Graph edges: {graph.g.number_of_edges()}")

    # Calculate graph algorithms ONCE.
    print("\nCalculating PageRank...")
    pagerank = graph.pagerank()

    print("Calculating betweenness...")
    betweenness = graph.betweenness()

    print("Calculating communities...")
    communities = graph.communities()

    print(f"\nPageRank nodes: {len(pagerank)}")
    print(f"Betweenness nodes: {len(betweenness)}")
    print(f"Communities: {len(set(communities.values()))}")

    # Calculate graph averages once.
    avg_pr = (
        sum(pagerank.values()) / len(pagerank)
        if pagerank
        else 0.0
    )

    avg_bw = (
        sum(betweenness.values()) / len(betweenness)
        if betweenness
        else 0.0
    )

    print("\nTop recipient accounts:")

    for account, count in recipient_counts.most_common(10):

        pr = pagerank.get(account, 0.0)
        bw = betweenness.get(account, 0.0)

        is_hub = (
            (avg_pr > 0 and pr >= 2.5 * avg_pr)
            or
            (avg_bw > 0 and bw >= 2.5 * avg_bw)
        )

        print(
            f"{account} | "
            f"received={count} | "
            f"pagerank={pr:.4f} | "
            f"betweenness={bw:.4f} | "
            f"hub={is_hub} | "
            f"community={communities.get(account)}"
        )


if __name__ == "__main__":
    run_experiment()