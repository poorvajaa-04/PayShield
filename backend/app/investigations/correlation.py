def extract_correlations(timeline: list[dict]) -> list[dict]:
    correlations = []

    transitions = [
        event for event in timeline
        if event.get("event") == "attack_state_transition"
    ]

    for event in transitions:
        correlations.append({
            "type": "state_transition",
            "stream": event.get("stream"),
            "from_state": event.get("from_state"),
            "to_state": event.get("to"),
            "reason": event.get("reason"),
        })

    return correlations