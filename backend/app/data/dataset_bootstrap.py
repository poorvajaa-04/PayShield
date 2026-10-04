from __future__ import annotations

"""
PayShield deployment dataset bootstrap.

The real-data pipeline expects the CIC-IDS2017 and PaySim datasets
at their existing local paths.

This module makes those datasets available automatically when the
application is deployed to an environment such as Render.

Local development:
    If the datasets already exist, nothing is downloaded.

Deployment:
    Missing datasets are downloaded from the public Hugging Face
    dataset repository and extracted to the exact paths expected by
    the existing adapters.

IMPORTANT:
    This module does NOT modify the real-data processing logic.
    It only makes the required dataset files available.
"""

from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZipFile
import shutil


# =====================================================================
# HUGGING FACE DATASET CONFIGURATION
# =====================================================================

HF_BASE_URL = (
    "https://huggingface.co/datasets/"
    "poorvajaa-04/PayShield-Real-Datasets/resolve/main"
)

CIC_ZIP_NAME = "MachineLearningCSV.zip"

PAYSIM_ZIP_NAME = (
    "PS_20174392719_1491204439457_log.csv.zip"
)


# =====================================================================
# PAYSHIELD PATHS
# =====================================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

DATA_ROOT = (
    PROJECT_ROOT
    / "data"
    / "raw"
)

CIC_ROOT = (
    DATA_ROOT
    / "cic-ids"
)

CIC_DATASET_DIR = (
    CIC_ROOT
    / "MachineLearningCVE"
)

PAYSIM_ROOT = (
    DATA_ROOT
    / "paysim"
)

PAYSIM_CSV = (
    PAYSIM_ROOT
    / "PS_20174392719_1491204439457_log.csv"
)


# =====================================================================
# DOWNLOAD
# =====================================================================

def _download_file(
    url: str,
    destination: Path,
) -> None:
    """
    Download a remote file using a streamed HTTP request.

    The file is first written to a temporary .part file and renamed
    only after the download completes successfully.
    """

    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temporary_destination = Path(
        str(destination) + ".part"
    )

    if temporary_destination.exists():
        temporary_destination.unlink()

    print(
        f"[PayShield] Downloading: {url}"
    )

    request = Request(
        url,
        headers={
            "User-Agent": "PayShield-Prototype/1.0",
        },
    )

    try:
        with urlopen(
            request,
            timeout=300,
        ) as response:

            with temporary_destination.open(
                "wb"
            ) as output:

                shutil.copyfileobj(
                    response,
                    output,
                    length=1024 * 1024,
                )

        temporary_destination.replace(
            destination
        )

        print(
            f"[PayShield] Download complete: "
            f"{destination}"
        )

    except Exception:

        if temporary_destination.exists():
            temporary_destination.unlink()

        raise


# =====================================================================
# EXTRACTION
# =====================================================================

def _extract_zip(
    archive: Path,
    destination: Path,
) -> None:
    """
    Extract a ZIP archive into the requested directory.
    """

    destination.mkdir(
        parents=True,
        exist_ok=True,
    )

    print(
        f"[PayShield] Extracting: {archive}"
    )

    with ZipFile(
        archive,
        "r",
    ) as zip_file:

        zip_file.extractall(
            destination
        )


# =====================================================================
# CIC-IDS2017
# =====================================================================

def ensure_cic_dataset() -> None:
    """
    Ensure the CIC-IDS2017 dataset exists at:

        data/raw/cic-ids/MachineLearningCVE

    If it already exists, no network request is made.

    Otherwise:

        1. Download MachineLearningCSV.zip
        2. Extract it
        3. Remove the ZIP
        4. Verify the expected directory exists
    """

    # -------------------------------------------------------------
    # Already available
    # -------------------------------------------------------------

    if (
        CIC_DATASET_DIR.exists()
        and any(
            CIC_DATASET_DIR.glob("*.csv")
        )
    ):
        print(
            "[PayShield] CIC-IDS2017 dataset already available."
        )
        return

    # -------------------------------------------------------------
    # Prepare directory
    # -------------------------------------------------------------

    CIC_ROOT.mkdir(
        parents=True,
        exist_ok=True,
    )

    archive = (
        CIC_ROOT
        / CIC_ZIP_NAME
    )

    # -------------------------------------------------------------
    # Download
    # -------------------------------------------------------------

    if not archive.exists():

        _download_file(
            url=(
                f"{HF_BASE_URL}/"
                f"{CIC_ZIP_NAME}"
            ),
            destination=archive,
        )

    # -------------------------------------------------------------
    # Extract
    # -------------------------------------------------------------

    _extract_zip(
        archive=archive,
        destination=CIC_ROOT,
    )

    # -------------------------------------------------------------
    # Remove ZIP immediately after extraction
    # -------------------------------------------------------------

    if archive.exists():
        archive.unlink()

        print(
            "[PayShield] Removed CIC-IDS2017 ZIP."
        )

    # -------------------------------------------------------------
    # Verify extraction
    # -------------------------------------------------------------

    if not (
        CIC_DATASET_DIR.exists()
        and any(
            CIC_DATASET_DIR.glob("*.csv")
        )
    ):
        raise RuntimeError(
            "CIC-IDS2017 extraction completed, "
            "but MachineLearningCVE was not found."
        )

    print(
        "[PayShield] CIC-IDS2017 dataset ready."
    )


# =====================================================================
# PAYSim
# =====================================================================

def ensure_paysim_dataset() -> None:
    """
    Ensure the PaySim CSV exists at:

        data/raw/paysim/
        PS_20174392719_1491204439457_log.csv

    If it already exists, no network request is made.

    Otherwise:

        1. Download the ZIP
        2. Extract it
        3. Remove the ZIP
        4. Verify the expected CSV exists
    """

    # -------------------------------------------------------------
    # Already available
    # -------------------------------------------------------------

    if PAYSIM_CSV.exists():

        print(
            "[PayShield] PaySim dataset already available."
        )

        return

    # -------------------------------------------------------------
    # Prepare directory
    # -------------------------------------------------------------

    PAYSIM_ROOT.mkdir(
        parents=True,
        exist_ok=True,
    )

    archive = (
        PAYSIM_ROOT
        / PAYSIM_ZIP_NAME
    )

    # -------------------------------------------------------------
    # Download
    # -------------------------------------------------------------

    if not archive.exists():

        _download_file(
            url=(
                f"{HF_BASE_URL}/"
                f"{PAYSIM_ZIP_NAME}"
            ),
            destination=archive,
        )

    # -------------------------------------------------------------
    # Extract
    # -------------------------------------------------------------

    _extract_zip(
        archive=archive,
        destination=PAYSIM_ROOT,
    )

    # -------------------------------------------------------------
    # Remove ZIP immediately after extraction
    # -------------------------------------------------------------

    if archive.exists():
        archive.unlink()

        print(
            "[PayShield] Removed PaySim ZIP."
        )

    # -------------------------------------------------------------
    # Verify extraction
    # -------------------------------------------------------------

    if not PAYSIM_CSV.exists():

        raise RuntimeError(
            "PaySim extraction completed, "
            "but the expected CSV was not found."
        )

    print(
        "[PayShield] PaySim dataset ready."
    )


# =====================================================================
# COMPLETE DATASET BOOTSTRAP
# =====================================================================

def ensure_real_datasets() -> None:
    """
    Ensure both real datasets required by PayShield are available.

    The existing dataset adapters and real_case.py are intentionally
    unchanged.
    """

    print(
        "[PayShield] Checking real datasets..."
    )

    ensure_cic_dataset()

    ensure_paysim_dataset()

    print(
        "[PayShield] All real datasets are ready."
    )