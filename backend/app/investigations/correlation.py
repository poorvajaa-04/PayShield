"""
Correlation extraction for PayShield.

Converts timeline attack-state transitions into the correlation
objects exposed by the investigation API.

Supports:
- TimelineEvent model objects
- plain dictionaries

The Correlator determines the attack-state progression.
This module only extracts that already-computed progression.
"""

from __future__ import annotations

from typing import Any


def _read_event_value(
    event: Any,
    key: str,
    default=None,
):
    """
    Safely read a value from either:

    1. a dictionary
    2. a Pydantic/model object
    3. an object exposing the value as an attribute
    """

    if isinstance(event, dict):
        return event.get(key, default)

    # Pydantic model
    if hasattr(event, "model_dump"):
        data = event.model_dump()
        return data.get(key, default)

    # Older Pydantic compatibility
    if hasattr(event, "dict"):
        data = event.dict()
        return data.get(key, default)

    # Normal Python object
    return getattr(event, key, default)


def extract_correlations(
    timeline: list[Any],
) -> list[dict]:
    """
    Extract attack-state transitions from a case timeline.

    The function accepts either serialized timeline dictionaries
    or TimelineEvent model objects.
    """

    correlations: list[dict] = []

    for event in timeline:

        event_name = _read_event_value(
            event,
            "event",
        )

        if event_name != "attack_state_transition":
            continue

        correlations.append(
            {
                "type": "state_transition",
                "stream": _read_event_value(
                    event,
                    "stream",
                ),
                "from_state": _read_event_value(
                    event,
                    "from_state",
                ),
                "to_state": _read_event_value(
                    event,
                    "to",
                ),
                "reason": _read_event_value(
                    event,
                    "reason",
                ),
            }
        )

    return correlations