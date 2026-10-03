from .case import InvestigationCase
from .correlation import extract_correlations


def build_investigation_case(result: dict, graph) -> InvestigationCase:
    """
    Build the evaluator-facing investigation representation from the
    exact PayShield pipeline result and EntityGraph used for the case.

    The investigation is a read-only projection of the actual pipeline.

    Important:
    The Case model stores TimelineEvent objects.
    The investigation API stores timeline entries as dictionaries.
    Therefore, this function explicitly normalizes every timeline event
    before passing it to the correlation extractor.
    """

    case = result["case"]

    # ===============================================================
    # ENTITY GRAPH
    # ===============================================================

    graph_data = graph.to_viz_dict()

    # ===============================================================
    # TIMELINE NORMALIZATION
    # ===============================================================
    #
    # Case.timeline may contain TimelineEvent Pydantic objects.
    # Convert EVERY event to a plain dictionary before any code tries
    # to access it with .get().
    #

    raw_timeline = case.get("timeline", [])

    timeline = []

    for event in raw_timeline:

        if isinstance(event, dict):
            timeline.append(event)

        elif hasattr(event, "to_dict"):
            timeline.append(event.to_dict())

        elif hasattr(event, "model_dump"):
            timeline.append(event.model_dump())

        else:
            raise TypeError(
                f"Unsupported timeline event type: {type(event).__name__}"
            )

    # ===============================================================
    # CORRELATIONS
    # ===============================================================

    correlations = extract_correlations(timeline)

    # ===============================================================
    # INVESTIGATION
    # ===============================================================

    return InvestigationCase(
        case_id=case["case_id"],

        status="Analysis Complete",

        evidence=case.get(
            "evidence",
            [],
        ),

        # Entity graph nodes
        entities=graph_data.get(
            "nodes",
            [],
        ),

        # Entity graph relationships
        edges=graph_data.get(
            "edges",
            [],
        ),

        # Normalized timeline
        timeline=timeline,

        # Extracted attack-state transitions
        correlations=correlations,

        # Current attack state
        attack_state=case.get(
            "attack_state"
        ),

        # Risk index if one exists
        risk_index=case.get(
            "risk_index"
        ),

        # Orchestrator decision
        policy_decision=case.get(
            "final_action"
        ),

        # Evidence-backed explanations
        findings=result.get(
            "explanation",
            [],
        ),
    )