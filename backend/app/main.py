from fastapi import FastAPI, HTTPException

from app.models.case import Case, TimelineEvent


app = FastAPI(title="PayShield API")


cases: dict[str, Case] = {}


@app.get("/")
def root():
    return {"project": "PayShield", "status": "running"}


@app.post("/cases")
def create_case(case: Case):
    cases[case.case_id] = case
    return case


@app.post("/cases/{case_id}/events")
def add_event(case_id: str, event: TimelineEvent):
    case = cases.get(case_id)

    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    case.timeline.append(event)

    return case

@app.get("/cases/{case_id}")
def get_case(case_id: str):
    case = cases.get(case_id)

    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    return case