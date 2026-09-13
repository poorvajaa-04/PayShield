from fastapi import FastAPI

from app.models.case import Case

app = FastAPI(title="PayShield API")


cases: dict[str, Case] = {}


@app.get("/")
def root():
    return {"project": "PayShield", "status": "running"}


@app.post("/cases")
def create_case(case: Case):
    cases[case.case_id] = case
    return case