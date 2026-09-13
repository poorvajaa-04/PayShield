from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class EvidenceOutput(BaseModel):
    stream: Literal["lure", "network", "session"]
    probability: float
    matched_pattern: str | None
    case_id: str | None
    timestamp: datetime