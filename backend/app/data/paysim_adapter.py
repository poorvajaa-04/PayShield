"""
PaySim adapter for PayShield.

Reads the real PaySim transaction dataset and converts rows into a
small normalized transaction structure that can be consumed by the
PayShield entity graph and correlator.

PaySim fields used:
    step
    type
    amount
    nameOrig
    nameDest
    isFraud
    isFlaggedFraud
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterator

import pandas as pd


PAYSIM_DIR = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "raw"
    / "paysim"
)

PAYSIM_FILE = PAYSIM_DIR / "PS_20174392719_1491204439457_log.csv"


def get_paysim_file() -> Path:
    """Return the real PaySim CSV path."""

    if not PAYSIM_FILE.exists():
        raise FileNotFoundError(
            f"PaySim dataset not found: {PAYSIM_FILE}"
        )

    return PAYSIM_FILE


def get_paysim_row_count() -> int:
    """Return the number of transaction rows without loading the whole file."""

    file_path = get_paysim_file()

    count = 0

    for chunk in pd.read_csv(
        file_path,
        usecols=["step"],
        chunksize=100_000,
    ):
        count += len(chunk)

    return count


def _normalize_row(row: dict) -> dict:
    """Convert one raw PaySim row into a PayShield transaction."""

    return {
        "stream": "transaction",
        "source": "PaySim",
        "step": int(row["step"]),
        "transaction_type": str(row["type"]),
        "amount": float(row["amount"]),
        "from_account": str(row["nameOrig"]),
        "to_account": str(row["nameDest"]),
        "is_fraud": int(row["isFraud"]),
        "is_flagged_fraud": int(row["isFlaggedFraud"]),
    }


def load_paysim_sample(
    limit: int = 10,
    fraud_only: bool = False,
) -> list[dict]:
    """
    Load a small sample from the real PaySim dataset.

    Parameters
    ----------
    limit:
        Maximum number of rows returned.

    fraud_only:
        If True, return fraudulent PaySim transactions only.
    """

    if limit <= 0:
        return []

    file_path = get_paysim_file()

    usecols = [
        "step",
        "type",
        "amount",
        "nameOrig",
        "nameDest",
        "isFraud",
        "isFlaggedFraud",
    ]

    results: list[dict] = []

    for chunk in pd.read_csv(
        file_path,
        usecols=usecols,
        chunksize=100_000,
    ):
        if fraud_only:
            chunk = chunk[chunk["isFraud"] == 1]

        for row in chunk.to_dict("records"):
            results.append(_normalize_row(row))

            if len(results) >= limit:
                return results

    return results


def iter_paysim(
    chunk_size: int = 100_000,
    fraud_only: bool = False,
) -> Iterator[dict]:
    """
    Stream the real PaySim dataset without loading all 493 MB into memory.

    This is the preferred function for larger experiments.
    """

    file_path = get_paysim_file()

    usecols = [
        "step",
        "type",
        "amount",
        "nameOrig",
        "nameDest",
        "isFraud",
        "isFlaggedFraud",
    ]

    for chunk in pd.read_csv(
        file_path,
        usecols=usecols,
        chunksize=chunk_size,
    ):
        if fraud_only:
            chunk = chunk[chunk["isFraud"] == 1]

        for row in chunk.to_dict("records"):
            yield _normalize_row(row)

def load_paysim_graph_sample(
    limit: int = 100,
    fraud_only: bool = False,
) -> list[dict]:
    """
    Load PaySim transactions specifically for entity-graph experiments.

    Returns normalized transactions suitable for EntityGraph.add_transaction_edge().
    """

    return load_paysim_sample(
        limit=limit,
        fraud_only=fraud_only,
    )