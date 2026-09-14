from dataclasses import dataclass, field
from typing import Any


@dataclass
class InvestigationCase:
    case_id: str
    status: str
    evidence: list[dict[str, Any]] = field(default_factory=list)
    entities: list[dict[str, Any]] = field(default_factory=list)
    timeline: list[dict[str, Any]] = field(default_factory=list)
    correlations: list[dict[str, Any]] = field(default_factory=list)
    attack_state: str | None = None
    risk_index: int | None = None
    policy_decision: str | None = None
    findings: list[str] = field(default_factory=list)