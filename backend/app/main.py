from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.models.case import Case, TimelineEvent
from backend.app.entity_graph.entity_graph import EntityGraph
from backend.app.pipeline import run_case


app = FastAPI(title="PayShield API")


# Allow the deployed Next.js frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


cases: dict[str, Case] = {}


class RunCaseRequest(BaseModel):
    script: list[dict]
    correlated: bool = True


@app.get("/")
def root():
    return {
        "project": "PayShield",
        "status": "running",
    }


@app.post("/cases")
def create_case(case: Case):
    cases[case.case_id] = case
    return case


@app.post("/cases/{case_id}/events")
def add_event(case_id: str, event: TimelineEvent):
    case = cases.get(case_id)

    if case is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    case.timeline.append(event)

    return case


@app.get("/cases/{case_id}")
def get_case(case_id: str):
    case = cases.get(case_id)

    if case is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    return case


@app.post("/cases/{case_id}/run")
def run_existing_case(
    case_id: str,
    request: RunCaseRequest,
):
    graph = EntityGraph()

    try:
        result = run_case(
            case_id=case_id,
            script=request.script,
            graph=graph,
            correlated=request.correlated,
        )

        return result

    except KeyError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )