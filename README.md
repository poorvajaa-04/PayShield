# Project Exhibition-I

# PayShield - Study and Analysis of Finance Fraud Detection
**Live Prototype:** https://pay-shield-psi.vercel.app/

## Overview

**PayShield** is a prototype finance fraud detection and investigation system designed to study how multiple sources of security and financial evidence can be combined to identify suspicious activity.

The system combines **network behaviour, financial transactions, entity relationships, and investigation evidence** to build a unified view of a potentially fraudulent case.

It uses real-world datasets including:

* **CIC-IDS2017** — network intrusion and traffic data
* **PaySim** — financial transaction and fraud data

The prototype correlates evidence across these sources and produces an explainable investigation outcome and suggested response.

## Key Features

* Real-data integration using CIC-IDS2017 and PaySim
* Multi-stage evidence collection
* Cross-source event correlation
* Entity relationship analysis
* Investigation timeline generation
* Explainable evidence and findings
* Policy-based response orchestration
* FastAPI backend
* Next.js frontend
* Local and Render deployment support

## System Architecture

```text
Real Data Sources
      │
      ├── CIC-IDS2017
      └── PaySim
             │
             ▼
      Evidence Processing
             │
             ▼
        Correlator
             │
             ▼
       Entity Graph
             │
             ▼
      Investigation Case
             │
             ▼
       Orchestrator
             │
             ▼
   Suggested Response / Action
             │
             ▼
         Frontend
```

## Project Structure

```text
PayShield/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── correlator/
│   │   ├── entity_graph/
│   │   ├── evidence/
│   │   ├── models/
│   │   └── orchestrator/
│   ├── tests/
│   └── requirements.txt
│
├── data/
│   ├── raw/
│   │   ├── cic-ids/
│   │   └── paysim/
│   └── processed/
│
├── docs/
│
├── frontend/
│   ├── app/
│   └── public/
│
├── .gitignore
├── LICENSE
└── README.md
```

## Technology Stack

**Backend**

* Python
* FastAPI
* Pydantic
* Pandas
* Scikit-learn
* XGBoost
* NetworkX

**Frontend**

* Next.js
* React
* Tailwind CSS

**Data**

* CIC-IDS2017
* PaySim

## Deployment

The backend is deployed using **Render**, with the real datasets bootstrapped automatically when required.

The frontend is deployed separately and communicates with the backend through the configured API endpoint.

## Project Status

The prototype currently demonstrates:

* Real dataset availability and integration
* Real-data case generation
* Cross-stage correlation
* Entity-based evidence
* Investigation timeline and evidence output
* Automated orchestration of the final suggested action
* Successful local and deployed execution

## Purpose

PayShield is developed as a **prototype and study project** to explore how heterogeneous financial and cybersecurity data can be correlated to support fraud investigation.

It is intended to demonstrate the **analysis and investigation workflow**, rather than serve as a production financial fraud prevention system.
