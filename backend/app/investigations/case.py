from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class InvestigationCase(BaseModel):
    """
    Backend representation of a PayShield investigation.

    This model is a read-oriented projection of the actual case,
    correlation, entity graph, timeline, and policy results produced
    by the PayShield pipeline.

    It does not independently calculate security decisions.
    """

    case_id: str

    status: str = "Under Investigation"

    # ---------------------------------------------------------------
    # Evidence
    # ---------------------------------------------------------------

    evidence: list[dict[str, Any]] = Field(
        default_factory=list
    )

    # ---------------------------------------------------------------
    # Entity graph
    # ---------------------------------------------------------------

    entities: list[dict[str, Any]] = Field(
        default_factory=list
    )

    edges: list[dict[str, Any]] = Field(
        default_factory=list
    )

    # ---------------------------------------------------------------
    # Temporal / correlation information
    # ---------------------------------------------------------------

    timeline: list[dict[str, Any]] = Field(
        default_factory=list
    )

    correlations: list[dict[str, Any]] = Field(
        default_factory=list
    )

    # ---------------------------------------------------------------
    # Attack-state information
    # ---------------------------------------------------------------

    # Canonical attack-state vocabulary exposed from the existing
    # correlator so read-only consumers do not maintain a duplicate
    # state list.
    attack_states: list[str] = Field(
        default_factory=list
    )

    # Current state determined by the existing correlator.
    attack_state: str | None = None

    # ---------------------------------------------------------------
    # Risk information
    #
    # Kept optional because the current pipeline does not necessarily
    # calculate a numerical risk index.
    # ---------------------------------------------------------------

    risk_index: float | int | None = None

    # ---------------------------------------------------------------
    # Policy / orchestration
    # ---------------------------------------------------------------

    policy_decision: str | None = None

    # ---------------------------------------------------------------
    # Explainability
    # ---------------------------------------------------------------

    findings: list[Any] = Field(
        default_factory=list
    )