from .case import InvestigationCase
from .correlation import extract_correlations
from ..correlator import ATTACK_STATES


def build_investigation_case(result: dict, graph) -> InvestigationCase:
    """
    Build the evaluator-facing investigation representation from the
    exact PayShield pipeline result and EntityGraph used for the case.

    The investigation is a read-only projection of the actual pipeline.

    Important:
        The canonical attack-state vocabulary comes directly from the
        existing correlator. This builder does not calculate or modify
        attack states.
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

        # -----------------------------------------------------------
        # Evidence
        # -----------------------------------------------------------

        evidence=case.get(
            "evidence",
            [],
        ),

        # -----------------------------------------------------------
        # Entity graph
        # -----------------------------------------------------------

        entities=graph_data.get(
            "nodes",
            [],
        ),

        edges=graph_data.get(
            "edges",
            [],
        ),

        # -----------------------------------------------------------
        # Temporal case model
        # -----------------------------------------------------------

        timeline=timeline,

        # -----------------------------------------------------------
        # Existing correlation output
        # -----------------------------------------------------------

        correlations=correlations,

        # -----------------------------------------------------------
        # Canonical attack-state vocabulary
        #
        # IMPORTANT:
        # This is the exact existing list owned by the correlator.
        # The investigation layer only exposes it for read-only
        # consumers such as the Attack State page.
        # -----------------------------------------------------------

        attack_states=list(ATTACK_STATES),

        # -----------------------------------------------------------
        # Current attack state
        # -----------------------------------------------------------

        attack_state=case.get(
            "attack_state"
        ),

        # -----------------------------------------------------------
        # Risk index if one exists
        # -----------------------------------------------------------

        risk_index=case.get(
            "risk_index"
        ),

        # -----------------------------------------------------------
        # Existing orchestrator decision
        # -----------------------------------------------------------

        policy_decision=case.get(
            "final_action"
        ),

        # -----------------------------------------------------------
        # Evidence-backed explanations
        # -----------------------------------------------------------

        findings=result.get(
            "explanation",
            [],
        ),
    )