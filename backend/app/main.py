import traceback

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.app.models.case import Case, TimelineEvent
from backend.app.entity_graph.entity_graph import EntityGraph
from backend.app.pipeline import run_case
from backend.app.investigations.builder import build_investigation_case
from backend.app.data.real_case import (
    build_prototype_case,
    build_real_case_from_datasets,
)
from backend.app.data.dataset_bootstrap import (
    ensure_real_datasets,
)


app = FastAPI(title="PayShield API")


# =====================================================================
# DATASET BOOTSTRAP
# =====================================================================

@app.on_event("startup")
def prepare_real_datasets():
    """
    Ensure the real CIC-IDS2017 and PaySim datasets are available
    before the API starts handling requests.

    Local development:
        Existing datasets are detected and left untouched.

    Render/deployment:
        Missing datasets are downloaded from the public Hugging Face
        repository and extracted to the paths expected by the existing
        PayShield data adapters.
    """

    ensure_real_datasets()


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
    """
    Request body for running a PayShield case.

    script is optional so that PS-REAL-001 can automatically load
    the real CIC-IDS2017 + PaySim dataset-backed case.

    Existing callers can still provide an explicit script.
    """

    script: list[dict] = Field(default_factory=list)
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

    This endpoint exposes the generated dataset-backed script for
    inspection and debugging.
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
    """
    Run a PayShield case through the complete pipeline.

    For PS-REAL-001:

        If no script is supplied,
        automatically load the real
        CIC-IDS2017 + PaySim dataset-backed case.

    Therefore the caller can simply send:

        {
            "correlated": true
        }

    For other cases, an explicit script is still required.
    """

    graph = EntityGraph()

    try:

        # -------------------------------------------------------------
        # AUTOMATIC REAL-DATA LOADING
        # -------------------------------------------------------------
        #
        # PS-REAL-001 is the dataset-backed case.
        #
        # When the caller does not provide a script, build the script
        # directly from the actual CIC-IDS2017 and PaySim datasets.
        #
        # This allows the entire real-data flow to be executed through
        # one API request.
        # -------------------------------------------------------------

        if (
            case_id == "PS-REAL-001"
            and not request.script
        ):
            script = build_real_case_from_datasets(
                case_id=case_id,
            )

        else:
            script = request.script

        # -------------------------------------------------------------
        # Validate explicit scripts for non-real cases
        # -------------------------------------------------------------

        if not script:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No script supplied for this case. "
                    "For PS-REAL-001, omit the script to "
                    "automatically load CIC-IDS2017 + PaySim."
                ),
            )

        # -------------------------------------------------------------
        # Run the actual PayShield detection/correlation pipeline
        # -------------------------------------------------------------

        result = run_case(
            case_id=case_id,
            script=script,
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

    except HTTPException:
        raise

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

    except KeyError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =====================================================================
# INVESTIGATIONS
# =====================================================================

@app.get("/investigations")
def get_investigations():
    """
    Return all investigations currently stored by PayShield.

    Investigations are stored in memory and therefore represent
    cases processed during the current backend session.
    """

    return list(investigations.values())


@app.get("/investigations/{case_id}")
def get_investigation(case_id: str):
    """
    Return a single processed investigation by case ID.
    """

    investigation = investigations.get(
        case_id
    )

    if investigation is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    return investigation