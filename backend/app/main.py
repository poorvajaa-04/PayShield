from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.models.case import Case, TimelineEvent
from backend.app.entity_graph.entity_graph import EntityGraph
from backend.app.pipeline import run_case
from backend.app.investigations.builder import build_investigation_case
from backend.app.data.real_case import (
    build_prototype_case,
    build_real_case_from_datasets,
)


app = FastAPI(title="PayShield API")


# =====================================================================
# CORS
# =====================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================================
# IN-MEMORY PROTOTYPE STORAGE
# =====================================================================

cases: dict[str, Case] = {}
investigations = {}


# =====================================================================
# REQUEST MODELS
# =====================================================================

class RunCaseRequest(BaseModel):
    script: list[dict]
    correlated: bool = True


# =====================================================================
# ROOT
# =====================================================================

@app.get("/")
def root():
    return {
        "project": "PayShield",
        "status": "running",
    }


# =====================================================================
# CASE MANAGEMENT
# =====================================================================

@app.post("/cases")
def create_case(case: Case):
    cases[case.case_id] = case
    return case


@app.post("/cases/{case_id}/events")
def add_event(
    case_id: str,
    event: TimelineEvent,
):
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


# =====================================================================
# PROTOTYPE CASE
# =====================================================================

@app.get("/cases/{case_id}/demo")
def get_case_demo(case_id: str):
    """
    Return a small deterministic case for the deployed prototype.

    IMPORTANT:

    This endpoint does NOT calculate the final result.

    It only provides evidence to the existing PayShield pipeline.

    The pipeline remains responsible for:

        detectors
            ↓
        entity graph
            ↓
        correlator
            ↓
        orchestrator
            ↓
        explainability
    """

    if case_id != "PS-REAL-001":
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    try:
        script = build_prototype_case(
            case_id=case_id,
        )

        return {
            "case_id": case_id,
            "source": "PayShield prototype case",
            "script": script,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =====================================================================
# FULL DATASET-BACKED CASE
# =====================================================================

@app.get("/cases/{case_id}/real-data")
def get_real_dataset_case(case_id: str):
    """
    Build a case using the real CIC-IDS2017 + PaySim datasets.

    This endpoint is intended for the full dataset-backed version.
    """

    if case_id != "PS-REAL-001":
        raise HTTPException(
            status_code=404,
            detail="Real case not found",
        )

    try:
        script = build_real_case_from_datasets(
            case_id=case_id,
        )

        return {
            "case_id": case_id,
            "source": "CIC-IDS2017 + PaySim",
            "script": script,
        }

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =====================================================================
# RUN PAYSHIELD CASE
# =====================================================================

@app.post("/cases/{case_id}/run")
def run_existing_case(
    case_id: str,
    request: RunCaseRequest,
):
    graph = EntityGraph()

    try:

        # -------------------------------------------------------------
        # Run the actual PayShield detection/correlation pipeline
        # -------------------------------------------------------------

        result = run_case(
            case_id=case_id,
            script=request.script,
            graph=graph,
            correlated=request.correlated,
        )

        # -------------------------------------------------------------
        # Build investigation representation from the exact result
        # and entity graph used for this case
        # -------------------------------------------------------------

        investigation = build_investigation_case(
            result,
            graph,
        )

        # -------------------------------------------------------------
        # Store investigation
        # -------------------------------------------------------------

        investigations[case_id] = investigation

        # -------------------------------------------------------------
        # Preserve existing API response
        # -------------------------------------------------------------

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


# =====================================================================
# INVESTIGATION
# =====================================================================

@app.get("/investigations/{case_id}")
def get_investigation(case_id: str):

    investigation = investigations.get(
        case_id
    )

    if investigation is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    return investigation