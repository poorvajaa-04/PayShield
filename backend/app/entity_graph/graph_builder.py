import csv
from pathlib import Path

import networkx as nx


def build_transaction_graph(csv_path: str) -> nx.DiGraph:
    graph = nx.DiGraph()

    with open(csv_path, "r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            sender = row["nameOrig"]
            receiver = row["nameDest"]

            graph.add_node(sender, type="account")
            graph.add_node(receiver, type="account")

            graph.add_edge(
                sender,
                receiver,
                type=row["type"],
                amount=float(row["amount"]),
                timestamp=int(row["step"]),
                is_fraud=int(row["isFraud"]),
            )

    return graph