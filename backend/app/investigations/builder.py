from .case import InvestigationCase
from .correlation import extract_correlations


def build_investigation_case(result: dict, graph) -> InvestigationCase:
    case = result["case"]

    graph_data = graph.to_viz_dict()

    timeline = case.get("timeline", [])
    correlations = extract_correlations(timeline)

    return InvestigationCase(
        case_id=case["case_id"],
        status="Under Investigation",
        evidence=case.get("evidence", []),
        entities=graph_data.get("nodes", []),
        timeline=timeline,
        correlations=correlations,
        attack_state=case.get("attack_state"),
        risk_index=case.get("risk_index"),
        policy_decision=case.get("final_action"),
        findings=result.get("explanation", []),
    )