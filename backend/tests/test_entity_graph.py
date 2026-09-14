import os
import tempfile

from backend.app.entity_graph.entity_graph import EntityGraph


def test_add_account():
    graph = EntityGraph()

    result = graph.add_account("ACC-001")

    assert result == "ACC-001"
    assert graph.g.has_node("ACC-001")
    assert graph.g.nodes["ACC-001"]["kind"] == "account"
    assert graph.g.nodes["ACC-001"]["confirmed_mule"] is False
    assert graph.g.nodes["ACC-001"]["dismissed"] is False
    assert graph.g.nodes["ACC-001"]["risk_tier"] == 0


def test_add_device():
    graph = EntityGraph()

    result = graph.add_device("DEV-001")

    assert result == "DEV-001"
    assert graph.g.nodes["DEV-001"]["kind"] == "device"


def test_add_transaction_edge():
    graph = EntityGraph()

    graph.add_transaction_edge(
        "ACC-A",
        "ACC-B",
        10000,
        "10:00",
    )

    assert graph.g.has_edge("ACC-A", "ACC-B")
    assert graph.g["ACC-A"]["ACC-B"]["kind"] == "transaction"
    assert graph.g["ACC-A"]["ACC-B"]["tx_count"] == 1
    assert graph.g["ACC-A"]["ACC-B"]["tx_amount"] == 10000


def test_repeated_transaction_updates_edge():
    graph = EntityGraph()

    graph.add_transaction_edge("ACC-A", "ACC-B", 10000, "10:00")
    graph.add_transaction_edge("ACC-A", "ACC-B", 5000, "10:05")

    assert graph.g["ACC-A"]["ACC-B"]["tx_count"] == 2
    assert graph.g["ACC-A"]["ACC-B"]["tx_amount"] == 15000


def test_fan_in_fan_out():
    graph = EntityGraph()

    graph.add_transaction_edge("ACC-A", "ACC-B", 100, "10:00")
    graph.add_transaction_edge("ACC-C", "ACC-B", 200, "10:01")
    graph.add_transaction_edge("ACC-B", "ACC-D", 300, "10:02")

    stats = graph.fan_in_fan_out("ACC-B")

    assert stats["incoming"] == 2
    assert stats["outgoing"] == 1


def test_shared_device_link():
    graph = EntityGraph()

    graph.add_shared_device_link("ACC-001", "DEV-001")

    assert graph.g.has_edge("ACC-001", "DEV-001")
    assert graph.g["ACC-001"]["DEV-001"]["kind"] == "device_link"


def test_device_linked_to_flagged_account():
    graph = EntityGraph()

    graph.add_shared_device_link("ACC-001", "DEV-001")
    graph.g.nodes["ACC-001"]["risk_tier"] = 2

    result = graph.device_linked_to_flagged_account("DEV-001")

    assert result == ["ACC-001"]


def test_device_with_no_flagged_account_returns_empty():
    graph = EntityGraph()

    graph.add_shared_device_link("ACC-001", "DEV-001")

    assert graph.device_linked_to_flagged_account("DEV-001") == []


def test_unknown_device_returns_empty():
    graph = EntityGraph()

    assert graph.device_linked_to_flagged_account("UNKNOWN") == []


def test_shared_identifier_link():
    graph = EntityGraph()

    graph.add_shared_identifier_link(
        "ACC-001",
        "9876500000",
        "phone",
    )

    assert graph.g.has_node("9876500000")
    assert graph.g.nodes["9876500000"]["kind"] == "phone"
    assert graph.g.has_edge("ACC-001", "9876500000")


def test_identifier_in_confirmed_scam():
    graph = EntityGraph()

    graph.add_shared_identifier_link(
        "ACC-001",
        "9876500000",
        "phone",
    )

    graph.confirm_mule("ACC-001")

    assert graph.identifier_in_confirmed_scam("9876500000") is True


def test_identifier_not_in_confirmed_scam():
    graph = EntityGraph()

    graph.add_shared_identifier_link(
        "ACC-001",
        "9876500000",
        "phone",
    )

    assert graph.identifier_in_confirmed_scam("9876500000") is False


def test_confirm_mule():
    graph = EntityGraph()

    graph.add_transaction_edge(
        "ACC-VICTIM",
        "ACC-MULE",
        50000,
        "10:00",
    )

    result = graph.confirm_mule("ACC-MULE")

    assert result["outcome"] == "confirmed"
    assert result["confirmed_mule"] == "ACC-MULE"
    assert graph.g.nodes["ACC-MULE"]["confirmed_mule"] is True
    assert graph.g.nodes["ACC-MULE"]["risk_tier"] == 3


def test_confirm_mule_propagates_risk():
    graph = EntityGraph()

    graph.add_transaction_edge(
        "ACC-VICTIM",
        "ACC-MULE",
        50000,
        "10:00",
    )

    result = graph.confirm_mule("ACC-MULE")

    assert len(result["propagated_to"]) == 1
    assert result["propagated_to"][0]["account"] == "ACC-VICTIM"
    assert result["propagated_to"][0]["risk_tier_before"] == 0
    assert result["propagated_to"][0]["risk_tier_after"] == 1


def test_dismiss_mule():
    graph = EntityGraph()

    result = graph.dismiss_mule(
        "ACC-001",
        reason="verified legitimate merchant",
    )

    assert result["outcome"] == "dismissed"
    assert result["account"] == "ACC-001"
    assert result["reason"] == "verified legitimate merchant"
    assert graph.g.nodes["ACC-001"]["dismissed"] is True
    assert graph.g.nodes["ACC-001"]["confirmed_mule"] is False


def test_dismissed_mule_does_not_become_confirmed():
    graph = EntityGraph()

    graph.dismiss_mule("ACC-001")

    assert graph.g.nodes["ACC-001"]["confirmed_mule"] is False


def test_account_subgraph_contains_transaction_edges():
    graph = EntityGraph()

    graph.add_transaction_edge("ACC-A", "ACC-B", 100, "10:00")
    graph.add_shared_device_link("ACC-A", "DEV-1")

    subgraph = graph.account_subgraph()

    assert "ACC-A" in subgraph.nodes
    assert "ACC-B" in subgraph.nodes
    assert "DEV-1" not in subgraph.nodes
    assert subgraph.has_edge("ACC-A", "ACC-B")


def test_empty_graph_analytics():
    graph = EntityGraph()

    assert graph.pagerank() == {}
    assert graph.betweenness() == {}
    assert graph.communities() == {}


def test_unknown_account_mule_signal():
    graph = EntityGraph()

    signal = graph.compute_mule_signal("UNKNOWN")

    assert signal["is_confirmed_mule"] is False
    assert signal["community_id"] is None
    assert signal["confirmed_mules_in_community"] == []
    assert signal["is_structural_hub"] is False
    assert signal["pagerank"] == 0.0
    assert signal["betweenness"] == 0.0


def test_register_dormancy():
    graph = EntityGraph()

    graph.register_dormancy("ACC-001", 30)

    assert graph.g.nodes["ACC-001"]["dormant_days"] == 30


def test_register_pass_through():
    graph = EntityGraph()

    graph.register_pass_through(
        "ACC-001",
        90,
        5,
    )

    assert graph.g.nodes["ACC-001"]["pass_through_pct"] == 90
    assert graph.g.nodes["ACC-001"]["pass_through_minutes"] == 5


def test_to_viz_dict():
    graph = EntityGraph()

    graph.add_transaction_edge(
        "ACC-A",
        "ACC-B",
        100,
        "10:00",
    )

    result = graph.to_viz_dict()

    assert "nodes" in result
    assert "edges" in result
    assert len(result["nodes"]) == 2
    assert len(result["edges"]) == 1


def test_sqlite_round_trip():
    graph = EntityGraph()

    graph.add_transaction_edge(
        "ACC-A",
        "ACC-B",
        1000,
        "10:00",
    )

    graph.confirm_mule("ACC-B")

    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "graph.db")

        graph.save_to_sqlite(path)

        reloaded = EntityGraph.load_from_sqlite(path)

        assert reloaded.g.number_of_nodes() == graph.g.number_of_nodes()
        assert reloaded.g.number_of_edges() == graph.g.number_of_edges()

        assert reloaded.g.nodes["ACC-B"]["confirmed_mule"] is True
        assert reloaded.fan_in_fan_out("ACC-B") == graph.fan_in_fan_out("ACC-B")