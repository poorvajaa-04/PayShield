"""
Temporal case model — Section 4.

Each case is a sequence of timestamped events, not a single snapshot.
The correlator's state-machine transition history is represented by the timeline.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class TimelineEvent(BaseModel):
    t: str
    event: str
    stream: Optional[str] = None
    extra: dict = Field(default_factory=dict)

    def to_dict(self) -> dict:
        data = {
            "t": self.t,
            "event": self.event,
        }

        if self.stream:
            data["stream"] = self.stream

        data.update(self.extra)

        return data


class Case(BaseModel):
    case_id: str
    timeline: list[TimelineEvent] = Field(default_factory=list)
    attack_state: str = "NONE"
    evidence: list[dict] = Field(default_factory=list)
    final_action: Optional[str] = None

    def log(
        self,
        event: str,
        stream: Optional[str] = None,
        t: Optional[str] = None,
        **extra,
    ):
        timestamp = t or datetime.now(timezone.utc).strftime("%H:%M:%S")

        self.timeline.append(
            TimelineEvent(
                t=timestamp,
                event=event,
                stream=stream,
                extra=extra,
            )
        )

    def add_evidence(self, stream: str, **data):
        self.evidence.append(
            {
                "stream": stream,
                **data,
            }
        )

    def to_dict(self) -> dict:
        return {
            "case_id": self.case_id,
            "attack_state": self.attack_state,
            "final_action": self.final_action,
            "timeline": [event.to_dict() for event in self.timeline],
            "evidence": self.evidence,
        }