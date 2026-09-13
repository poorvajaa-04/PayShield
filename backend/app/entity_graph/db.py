import sqlite3
from pathlib import Path

import networkx as nx


DB_PATH = Path(__file__).resolve().parents[3] / "data" / "processed" / "entity_graph.db"


def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DB_PATH)


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS nodes (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                flags TEXT
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS edges (
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                type TEXT NOT NULL,
                timestamp INTEGER,
                amount REAL,
                is_fraud INTEGER,
                PRIMARY KEY (source, target)
            )
        """)

        connection.commit()


def save_graph(graph: nx.DiGraph):
    initialize_database()

    with get_connection() as connection:
        connection.execute("DELETE FROM edges")
        connection.execute("DELETE FROM nodes")

        for node_id, attributes in graph.nodes(data=True):
            connection.execute(
                """
                INSERT INTO nodes (id, type, flags)
                VALUES (?, ?, ?)
                """,
                (
                    node_id,
                    attributes.get("type", "unknown"),
                    attributes.get("flags"),
                ),
            )

        for source, target, attributes in graph.edges(data=True):
            connection.execute(
                """
                INSERT INTO edges
                (source, target, type, timestamp, amount, is_fraud)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    source,
                    target,
                    attributes.get("type", "unknown"),
                    attributes.get("timestamp"),
                    attributes.get("amount"),
                    attributes.get("is_fraud"),
                ),
            )

        connection.commit()

def load_graph() -> nx.DiGraph:
    initialize_database()

    graph = nx.DiGraph()

    with get_connection() as connection:
        nodes = connection.execute(
            "SELECT id, type, flags FROM nodes"
        ).fetchall()

        for node_id, node_type, flags in nodes:
            graph.add_node(
                node_id,
                type=node_type,
                flags=flags,
            )

        edges = connection.execute(
            """
            SELECT source, target, type, timestamp, amount, is_fraud
            FROM edges
            """
        ).fetchall()

        for source, target, edge_type, timestamp, amount, is_fraud in edges:
            graph.add_edge(
                source,
                target,
                type=edge_type,
                timestamp=timestamp,
                amount=amount,
                is_fraud=is_fraud,
            )

    return graph

def get_device_links(account_id: str):
    """
    Return accounts connected through a shared device.

    Placeholder for the future session-risk stage.
    """
    return []


def get_known_scam_contacts(phone_or_vpa: str):
    """
    Return known scam contacts associated with a phone number or VPA.

    Placeholder for the future lure-risk stage.
    """
    return []


def get_community(account_id: str):
    """
    Return the community containing the account.

    Placeholder for the future mule-detection stage.
    """
    return None