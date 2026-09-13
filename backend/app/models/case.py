from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TimelineEvent(BaseModel):
    stream: Literal["lure", "network", "session", "entity_graph"]
    event_type: str
    timestamp: datetime


class Case(BaseModel):
    case_id: str
    timeline: list[TimelineEvent] = Field(default_factory=list)