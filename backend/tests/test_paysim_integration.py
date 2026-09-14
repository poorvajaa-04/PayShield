from backend.app.data.paysim_adapter import (
    get_paysim_file,
    load_paysim_sample,
    load_paysim_graph_sample,
)
from backend.app.entity_graph.entity_graph import EntityGraph


def test_paysim_file_exists():
    file_path = get_paysim_file()

    assert file_path.exists()
    assert file_path.suffix == ".csv"


def test_load_paysim_sample():
    sample = load_paysim_sample(5)

    assert len(sample) == 5

    for row in sample:
        assert row["stream"] == "transaction"
        assert row["source"] == "PaySim"
        assert isinstance(row["step"], int)
        assert isinstance(row["amount"], float)
        assert isinstance(row["from_account"], str)
        assert isinstance(row["to_account"], str)
        assert row["is_fraud"] in (0, 1)
        assert row["is_flagged_fraud"] in (0, 1)


def test_load_fraud_only_paysim_sample():
    sample = load_paysim_sample(10, fraud_only=True)

    assert len(sample) > 0

    for row in sample:
        assert row["stream"] == "transaction"
        assert row["source"] == "PaySim"
        assert row["is_fraud"] == 1


def test_paysim_graph_sample():
    transactions = load_paysim_graph_sample(20)

    assert len(transactions) == 20

    graph = EntityGraph()

    for row in transactions:
        graph.add_transaction_edge(
            row["from_account"],
            row["to_account"],
            row["amount"],
            str(row["step"]),
        )

    assert graph.g.number_of_nodes() > 0
    assert graph.g.number_of_edges() > 0


def test_paysim_fraud_graph():
    transactions = load_paysim_graph_sample(
        100,
        fraud_only=True,
    )

    assert len(transactions) > 0

    graph = EntityGraph()

    for row in transactions:
        graph.add_transaction_edge(
            row["from_account"],
            row["to_account"],
            row["amount"],
            str(row["step"]),
        )

    pagerank = graph.pagerank()
    betweenness = graph.betweenness()
    communities = graph.communities()

    assert len(pagerank) > 0
    assert len(betweenness) > 0
    assert len(communities) > 0