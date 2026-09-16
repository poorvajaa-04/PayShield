# PayShield

**Explainable Financial Fraud Detection & Investigation Prototype**

**Live Prototype:** https://pay-shield-psi.vercel.app/

---

## Overview

**PayShield** is an explainable financial fraud detection and investigation prototype designed to demonstrate how multiple independent security and transaction signals can be combined to identify suspicious activity and determine an appropriate policy response.

Instead of treating fraud detection as a single **risk-score generation problem**, PayShield separates the process into:

* **Detection** — identifying suspicious signals.
* **Correlation** — determining how independent signals relate to one another.
* **Investigation** — building an evidence-backed view of the case.
* **Decision** — selecting an appropriate policy action.
* **Explainability** — showing why the system reached its conclusion.

The prototype demonstrates how transaction behaviour, network activity, entity relationships, and temporal evidence can be combined into a single investigation workflow.

---

## Live Prototype

### 🌐 Deployed Application

**https://pay-shield-psi.vercel.app/**

The frontend is deployed using **Vercel**, while the backend API is deployed separately and communicates with the frontend through REST APIs.

---

## Problem

Traditional fraud detection systems often produce a risk score or alert without providing enough context about **why the activity is suspicious**.

For example, a single transaction may not appear sufficiently suspicious on its own. However, if the same case also contains:

* unusual transaction behaviour,
* suspicious network activity,
* a compromised or unusual entity relationship,
* and signals occurring within a relevant time window,

the combined evidence can indicate a much stronger attack pattern.

PayShield explores this **multi-signal correlation** approach.

---

# How PayShield Works

The prototype follows this general pipeline:

```text
Transaction / Security Signals
            ↓
      Evidence Collection
            ↓
      Signal Correlation
            ↓
      Attack-State Assessment
            ↓
       Investigation Case
            ↓
      Policy Decision Engine
            ↓
   Explainable Final Decision
```

The important design principle is that **correlation and policy decision are separate components**.

### Correlator

The **Correlator** answers:

> "What is happening?"

It combines related signals and identifies an attack state or suspicious activity pattern.

### Orchestrator

The **Orchestrator** answers:

> "What should the system do about it?"

Based on the correlated state and policy rules, it can produce decisions such as:

* `STEP_UP_AUTH`
* `TRANSACTION_HOLD`
* other policy actions supported by the prototype.

This separation prevents the system from treating a numerical risk score as the final decision.

---

# Investigation Model

PayShield represents suspicious activity as a **case** rather than an isolated alert.

A case can contain multiple evidence streams.

For example:

```text
Case
 │
 ├── Transaction Evidence
 │
 ├── Network Evidence
 │
 ├── Entity Relationships
 │
 └── Temporal Evidence
          ↓
      Correlation
          ↓
     Attack State
          ↓
    Policy Decision
```

This allows the investigation interface to show **how different pieces of evidence contribute to the final assessment**.

---

# Prototype Investigation Flow

The current prototype demonstrates an investigation workflow similar to:

```text
Case Created
     ↓
Evidence Collected
     ↓
Independent Signals Identified
     ↓
Signals Correlated
     ↓
Attack State Determined
     ↓
Evidence Connected
     ↓
Policy Engine Evaluates Case
     ↓
Decision Generated
     ↓
Explanation Presented
```

The frontend provides an investigation workspace where the user can inspect:

* Case status
* Correlated signals
* Evidence streams
* Attack-state assessment
* Risk/index information
* Policy decision
* Investigation details
* Entity relationships
* Timeline information

---

# Datasets

PayShield uses **two complementary datasets**.

## 1. CIC-IDS-2017

The **CIC-IDS-2017** dataset is used to provide network-security telemetry.

It contains network traffic representing different types of benign and malicious activity.

PayShield uses this data to demonstrate the network-security side of the system, including signals associated with suspicious network behaviour.

### Role in PayShield

```text
CIC-IDS-2017
      ↓
Network Telemetry
      ↓
Security Signals
      ↓
Correlation
      ↓
Investigation Evidence
```

---

## 2. PaySim

**PaySim** is a synthetic financial transaction dataset based on mobile-money transactions.

It is used to represent the financial transaction side of PayShield.

### Role in PayShield

```text
PaySim
   ↓
Transaction Behaviour
   ↓
Financial Signals
   ↓
Correlation
   ↓
Investigation Evidence
```

Using both datasets allows the prototype to demonstrate the idea of combining **financial behaviour with security telemetry** rather than analysing transactions in isolation.

---

# Entity Graph

PayShield includes an **entity graph** to represent relationships between entities involved in a case.

Possible entities include:

* Accounts
* Customers
* Devices
* IP addresses
* Transactions
* Network infrastructure
* Other relevant security entities

Conceptually:

```text
Account
   │
   ├── Transaction
   │
   ├── Device
   │
   └── IP Address
          │
          └── Network Activity
```

The graph acts as an **evidence source**.

Instead of only asking whether one event is suspicious, the system can investigate whether multiple events are connected through shared entities.

---

# Temporal Case Model

Time is important in fraud investigation.

A suspicious transaction occurring by itself may not provide enough context.

However:

```text
Network Signal
      ↓
Suspicious Entity Activity
      ↓
Transaction
      ↓
Additional Security Signal
```

occurring within a relevant time window can provide stronger evidence of a connected incident.

PayShield therefore treats a case as a **temporal sequence of evidence**, rather than a collection of unrelated events.

---

# Architecture

PayShield uses a monorepo structure:

```text
PayShield/
│
├── frontend/
│   ├── app/
│   ├── components/
│   └── ...
│
├── backend/
│   └── app/
│       ├── main.py
│       ├── pipeline.py
│       ├── correlator.py
│       ├── orchestrator.py
│       ├── explainability.py
│       │
│       ├── entity_graph/
│       ├── evidence/
│       ├── investigations/
│       └── models/
│
├── data/
│   └── raw/
│       ├── cic-ids/
│       └── paysim/
│
├── notebooks/
│
└── docs/
```

---

# Technology Stack

## Frontend

### Next.js

Used to build the web application and investigation interface.

### React

Used to create reusable UI components and manage the interactive frontend.

### Tailwind CSS

Used for responsive styling and interface design.

### Lucide React

Used for interface icons.

---

## Backend

### Python

Used for the core fraud-detection, correlation, investigation, and decision logic.

### FastAPI

Provides the REST API connecting the frontend with the backend.

### Uvicorn

Runs the FastAPI application.

---

## Data & Machine Learning

### Pandas

Used for processing and analysing structured datasets.

### NumPy

Used for numerical operations.

### Scikit-learn

Used for machine-learning and data-processing components.

### XGBoost

Used for gradient-boosting-based modelling where applicable.

---

## Graph & Investigation

### NetworkX

Used to represent and analyse entity relationships as graphs.

### Community Detection

Used for identifying meaningful structures or communities within graph relationships.

---

## Testing

### Pytest

Used to test backend functionality and validate the behaviour of individual components and the overall pipeline.

The prototype has been tested across the backend pipeline, API behaviour, investigation logic, correlation, and decision components.

---

# Backend API

The backend exposes REST endpoints for interacting with PayShield.

A case can be executed through:

```text
POST /cases/{case_id}/run
```

Example request:

```json
{
  "script": "...",
  "correlated": true
}
```

The API processes the case through the PayShield pipeline and returns the resulting investigation information.

The backend also supports the investigation workflow through the investigations API.

---

# Core Backend Components

## `main.py`

Responsible for:

* Creating the FastAPI application
* Defining API routes
* Configuring middleware
* Handling API requests

---

## `pipeline.py`

Acts as the central processing pipeline.

It coordinates the different stages involved in processing a case.

Conceptually:

```text
Input
 ↓
Evidence
 ↓
Correlation
 ↓
Investigation
 ↓
Policy
 ↓
Explanation
```

---

## `correlator.py`

Responsible for connecting independent signals.

It determines whether multiple observations form a meaningful attack or fraud pattern.

Its primary question is:

> **What is happening?**

---

## `orchestrator.py`

Responsible for the policy decision.

Its primary question is:

> **What should happen next?**

This component keeps the operational response separate from the detection/correlation logic.

---

## `explainability.py`

Provides supporting information explaining the generated assessment and decision.

The goal is to make the output understandable rather than presenting an unexplained score.

---

## `entity_graph/`

Contains functionality related to entity relationships and graph-based evidence.

---

## `evidence/`

Handles evidence associated with investigations and cases.

---

## `investigations/`

Contains the investigation case model and builder responsible for constructing an investigation view from correlated evidence.

---

# Frontend

The frontend provides a security-investigation-style interface.

The prototype includes sections such as:

### Overview

Provides a high-level view of the current case.

### Investigation

Shows how independent evidence streams combine into the current attack-state assessment and policy decision.

### Timeline

Shows the temporal sequence of relevant events.

### Entity Graph

Shows relationships between entities involved in the case.

The interface is designed around **investigation and evidence**, rather than simply displaying a risk score.

---

# Example Investigation

A sample investigation can contain evidence such as:

```text
Case: PS-INV-001

Attack State:
CREDENTIAL_ATTACK

Evidence:
├── Suspicious lure activity
├── Network-related evidence
├── Connected entities
└── Temporal relationship

Policy Decision:
STEP_UP_AUTH
```

Another case can demonstrate a higher-severity combination of signals and result in a policy action such as:

```text
TRANSACTION_HOLD
```

The exact decision is produced by the prototype's correlation and policy logic.

---

# Why This Architecture?

PayShield is intentionally designed around several layers.

### 1. Evidence Layer

Collects individual observations.

### 2. Correlation Layer

Connects observations that may represent the same underlying activity.

### 3. Investigation Layer

Organises the evidence into a case that an analyst can understand.

### 4. Decision Layer

Determines the appropriate policy action.

### 5. Explainability Layer

Provides the reasoning and evidence supporting the result.

This creates a distinction between:

```text
"What happened?"
        ↓
"How are the signals connected?"
        ↓
"What does this mean?"
        ↓
"What action should be taken?"
```

---

# Current Prototype Scope

The current prototype demonstrates:

* Financial transaction analysis
* Network-security telemetry
* Multi-signal correlation
* Entity relationships
* Temporal investigation
* Attack-state classification
* Policy decision logic
* Explainable investigation results
* REST API integration
* Interactive investigation frontend
* Backend testing
* Cloud deployment

---

# What the Prototype Does NOT Claim

PayShield is currently a **functional research/proof-of-concept prototype**, not a production banking fraud platform.

It does not currently provide:

* Real-time banking transaction ingestion
* Direct integration with payment gateways
* Production-scale stream processing
* Real customer data
* Guaranteed fraud detection
* Automated blocking of real transactions
* Production-grade model monitoring
* Full enterprise identity management
* Complete regulatory/compliance workflows

The datasets used are also not a direct representation of a live financial institution's production environment.

---

# Limitations

### Dataset limitations

CIC-IDS-2017 and PaySim are useful for experimentation but do not represent the full complexity of real-world financial institutions.

### Synthetic data

PaySim is synthetic, so its transaction behaviour cannot be assumed to perfectly match real customer behaviour.

### Correlation limitations

The prototype demonstrates correlation logic, but real-world correlation would require significantly larger and more diverse data sources.

### Production scalability

The current implementation is designed to demonstrate functionality and architecture rather than production-scale throughput.

### False positives and false negatives

Any fraud-detection system can incorrectly classify legitimate activity as suspicious or fail to identify fraudulent activity.

Therefore, the prototype's decisions should be treated as **demonstration outputs**, not definitive financial-security decisions.

---

# Future Development

The full PayShield system can be extended with:

* Real-time transaction streaming
* Real-time network telemetry
* More financial fraud datasets
* Device fingerprinting
* Behavioural profiling
* Advanced entity resolution
* Real-time graph updates
* Graph-based anomaly detection
* Continuous model monitoring
* Analyst feedback loops
* Case management
* Alert prioritisation
* Authentication-risk integration
* Production-grade event streaming
* Role-based access control
* Audit logging
* Compliance workflows
* Model explainability improvements
* Continuous retraining and evaluation

---

# Project Goal

The long-term goal of PayShield is to demonstrate an architecture where financial fraud detection is not treated as:

```text
Transaction
    ↓
Risk Score
    ↓
Block
```

but instead as:

```text
Multiple Evidence Sources
          ↓
     Correlation
          ↓
   Attack-State Model
          ↓
    Investigation
          ↓
    Policy Decision
          ↓
     Explanation
```

This makes the system more suitable for **security investigation, fraud analysis, and explainable decision-making**.

---

# Project Status

**Current Status: Functional Prototype**

The prototype is deployed and demonstrates the core end-to-end workflow from case input to correlated investigation and policy decision.

### Deployment

**Frontend:** Vercel
**Backend:** Render
**Repository:** PayShield monorepo

---

## Disclaimer

PayShield is an educational and research prototype created to demonstrate concepts in financial fraud detection, cybersecurity telemetry, evidence correlation, and explainable investigation.

It is not intended to make or automate real-world financial decisions.
