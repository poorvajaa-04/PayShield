# PayShield — Data Sources

## 1. CIC-IDS2017

**Purpose:** Network evidence stream

**Provider:** Canadian Institute for Cybersecurity

**Status:** Downloaded

**Version:** CIC-IDS2017

**Downloaded:** 2026-09-13

**Format used:** MachineLearningCSV.zip

**Local path:**
`data/raw/cic-ids/`

**Use in PayShield:**
Network traffic features and attack/benign labels for developing and evaluating the network evidence detector.

---

## 2. PaySim

**Purpose:** Entity graph and transaction evidence

**Status:** Downloaded

**Downloaded:** 2026-09-13

**File:** PS_20174392719_1491204439457_log.csv

**Format:** CSV

**Primary fields used:** nameOrig, nameDest, type, amount, step, isFraud

**Local path:**
`data/raw/paysim/`

**Use in PayShield:**
Transaction relationships will provide the initial account-to-account edges for the entity graph.

---

## 3. IEEE-CIS Fraud Detection

**Purpose:** Fraud and identity-related evidence

**Status:** Planned

**Local path:**
`data/raw/ieee-cis/`

**Use in PayShield:**
Transaction and identity attributes can be used to supplement fraud analysis and synthetic entity relationships.

---

## 4. Synthetic Lure Dataset

**Purpose:** Lure/scam evidence stream

**Status:** Week 2 — specification in Week 1

**Local path:**
`data/raw/lure/`

---

## 5. Synthetic Session Dataset

**Purpose:** Session anomaly evidence stream

**Status:** Week 2 — specification in Week 1

**Local path:**
`data/raw/session/`
