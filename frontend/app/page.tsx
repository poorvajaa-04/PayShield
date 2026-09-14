"use client";

import { useState } from "react";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CaseSummary from "@/components/CaseSummary";
import EvidencePanel from "@/components/EvidencePanel";
import CorrelationPanel from "@/components/CorrelationPanel";
import EntityGraphPanel from "@/components/EntityGraphPanel";
import AttackStatePanel from "@/components/AttackStatePanel";
import DecisionPanel from "@/components/DecisionPanel";

interface BackendEvidence {
  stream: string;
  probability?: number;
  anomaly_score?: number;
  matched_pattern?: string;
  triggering_feature?: string;
  amount?: number;
  to_account?: string;
  is_confirmed_mule?: boolean;
  community_id?: number | null;
  confirmed_mules_in_community?: string[];
  is_structural_hub?: boolean;
  pagerank?: number;
  betweenness?: number;
}

interface BackendTimelineEvent {
  t: string;
  event: string;
  stream: string;
  from_state?: string;
  to?: string;
  reason?: string;
  probability?: number;
  anomaly_score?: number;
  matched_pattern?: string;
  triggering_feature?: string;
  amount?: number;
  to_account?: string;
}

interface InvestigationData {
  case_id: string;
  status: string;
  evidence: BackendEvidence[];
  entities: Record<string, unknown>[];
  timeline: BackendTimelineEvent[];
  correlations: {
    type: string;
    stream?: string;
    from_state?: string;
    to_state?: string;
    reason?: string;
  }[];
  attack_state: string | null;
  risk_index: number | null;
  policy_decision: string | null;
  findings: string[];
}

interface BackendResult {
  mode: string;

  case: {
    case_id: string;
    attack_state: string;
    final_action: string;
    timeline: BackendTimelineEvent[];
    evidence: BackendEvidence[];
  };

  final_action: string;
  explanation: string[];
}


/* =========================================================
   TEST CASE
========================================================= */

const testScript = [
  {
    type: "lure",
    text: "I am from CBI. Share the OTP immediately or your account will be blocked.",
    identifier: "9876500000",
    t: "10:31",
  },

  {
    type: "network",
    failed_logins: 9,
    requests_per_minute: 40,
    distinct_source_ips: 6,
    t: "10:33",
  },

  {
    type: "session",
    is_new_device: true,
    geo_velocity_kmph: 850,
    login_hour_local: 3,
    remote_access_tool_detected: true,
    device_id: "DEV-88A1",
    t: "10:35",
  },

  {
    type: "transaction",
    amount: 85000,
    from_account: "ACC-0142",
    to_account: "ACC-0091",
    t: "10:37",
  },
];


/* =========================================================
   COMPONENT
========================================================= */

export default function Home() {
  const [loading, setLoading] = useState(false);

  const [result, setResult] =
    useState<BackendResult | null>(null);

  const [investigation, setInvestigation] =
    useState<InvestigationData | null>(null);

  const [error, setError] = useState("");


  /* =========================================================
     RUN ANALYSIS
  ========================================================= */

  const handleRun = async () => {
    setLoading(true);
    setError("");

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error(
          "NEXT_PUBLIC_API_URL is not configured."
        );
      }


      /* -----------------------------------------------------
         STEP 1
         Run the PayShield case pipeline
      ----------------------------------------------------- */

      const response = await fetch(
        `${apiUrl}/cases/PS-INV-001/run`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            script: testScript,
            correlated: true,
          }),
        }
      );


      if (!response.ok) {
        throw new Error(
          "Backend analysis failed."
        );
      }


      const data: BackendResult =
        await response.json();

      setResult(data);


      /* -----------------------------------------------------
         STEP 2
         Fetch the investigation created by the backend
      ----------------------------------------------------- */

      const investigationResponse =
        await fetch(
          `${apiUrl}/investigations/PS-INV-001`
        );


      if (!investigationResponse.ok) {
        throw new Error(
          "Investigation retrieval failed."
        );
      }


      const investigationData: InvestigationData =
        await investigationResponse.json();

      setInvestigation(
        investigationData
      );

    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Backend connection failed."
      );

    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     USE REAL INVESTIGATION DATA
  ========================================================= */

  const evidence =
    investigation?.evidence ??
    result?.case.evidence ??
    [];


  const lure =
    evidence.find(
      (item) => item.stream === "lure"
    );


  const network =
    evidence.find(
      (item) => item.stream === "network"
    );


  const session =
    evidence.find(
      (item) => item.stream === "session"
    );


  const transaction =
    evidence.find(
      (item) => item.stream === "entity_graph"
    );


  /* =========================================================
     RISK INDEX
  ========================================================= */

  const riskScore =
    investigation?.risk_index ??
    (
      result
        ? Math.round(
            Math.max(
              lure?.probability ?? 0,
              network?.probability ?? 0,
              session?.anomaly_score ?? 0
            ) * 100
          )
        : undefined
    );


  /* =========================================================
     ATTACK STATE
  ========================================================= */

  const attackState =
    investigation?.attack_state ??
    result?.case.attack_state;


  /* =========================================================
     DECISION
  ========================================================= */

  const finalAction =
    investigation?.policy_decision ??
    result?.final_action;


  const decision =
    finalAction === "TRANSACTION_HOLD"
      ? "TRANSACTION_HOLD"
      : finalAction === "BLOCK"
        ? "block"
        : finalAction === "ALLOW"
          ? "allow"
          : "pending";


  /* =========================================================
     TIMELINE / CORRELATION
  ========================================================= */

  const timeline =
    investigation?.timeline ??
    result?.case.timeline ??
    [];


  const correlations =
    investigation?.correlations ?? [];


  const transitions =
    timeline.filter(
      (event) =>
        event.event ===
        "attack_state_transition"
    );


  const correlationSignals =
    correlations.length > 0
      ? correlations.map(
          (correlation) => ({
            source:
              correlation.stream ??
              "correlation",

            finding:
              correlation.to_state ??
              "State transition",

            relation:
              correlation.reason ??
              "Cross-stage evidence contributed to state progression.",
          })
        )
      : transitions.map(
          (event) => ({
            source: event.stream,

            finding:
              event.to ??
              "State transition",

            relation:
              event.reason ??
              "Cross-stage evidence contributed to state progression.",
          })
        );


  /* =========================================================
     EXPLAINABILITY
  ========================================================= */

  const indicators =
    investigation?.findings ??
    result?.explanation.map(
      (item) =>
        item.replace(
          /^\d+\.\s*/,
          ""
        )
    ) ??
    [];


  return (
    <div className="min-h-screen bg-[#f4f5f6]">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar />


      <main className="ml-64 min-h-screen">

        {/* ===================================================
            HEADER
        =================================================== */}

        <Header
          onRun={handleRun}
          loading={loading}
        />


        <div className="px-8 py-8">

          <div className="mx-auto max-w-[1500px]">


            {/* =================================================
                PAGE HEADING
            ================================================= */}

            <div className="mb-8">

              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                Investigation workspace
              </p>


              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17191d]">
                Case intelligence
              </h1>


              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Review how independent evidence streams
                combine into an attack-state assessment
                and policy decision.
              </p>

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="mb-6 border border-[#e5b4b0] bg-[#fff8f7] px-5 py-4">

                <p className="text-sm font-medium text-[#b42318]">
                  {error}
                </p>

              </div>
            )}


            {/* =================================================
                CASE SUMMARY
            ================================================= */}

            <CaseSummary
              caseStatus={
                investigation?.status ??
                (
                  result
                    ? "Analysis complete"
                    : "Under investigation"
                )
              }

              evidenceCount={
                evidence.length
              }

              correlationStatus={
                investigation
                  ? "Signals correlated"
                  : result
                    ? "Signals correlated"
                    : "Awaiting analysis"
              }

              decision={
                finalAction ??
                "Pending"
              }

              riskScore={
                riskScore
              }
            />


            {/* =================================================
                EVIDENCE LAYER
            ================================================= */}

            <section className="mt-10">

              <div className="mb-5">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Evidence layer
                </p>


                <h2 className="mt-1 text-xl font-semibold text-[#17191d]">
                  Evidence streams
                </h2>


                <p className="mt-1 text-xs text-gray-500">
                  Independent signals · {evidence.length} streams
                </p>

              </div>


              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">


                {/* =================================================
                    LURE
                ================================================= */}

                <EvidencePanel
                  type="lure"

                  status={
                    lure
                      ? "active"
                      : "pending"
                  }

                  signal={
                    lure
                      ? `${lure.matched_pattern} · ${Math.round(
                          (lure.probability ?? 0) * 100
                        )}%`
                      : "Awaiting evidence"
                  }

                  observations={
                    lure
                      ? [
                          "Message and impersonation evidence detected.",
                          `Pattern: ${lure.matched_pattern}.`,
                        ]
                      : []
                  }
                />


                {/* =================================================
                    NETWORK
                ================================================= */}

                <EvidencePanel
                  type="network"

                  status={
                    network
                      ? "active"
                      : "pending"
                  }

                  signal={
                    network
                      ? `${network.matched_pattern} · ${Math.round(
                          (network.probability ?? 0) * 100
                        )}%`
                      : "Awaiting evidence"
                  }

                  observations={
                    network
                      ? [
                          "Failed-login and request-rate behaviour detected.",
                          `${network.matched_pattern}.`,
                        ]
                      : []
                  }
                />


                {/* =================================================
                    TRANSACTION
                ================================================= */}

                <EvidencePanel
                  type="transaction"

                  status={
                    transaction
                      ? "active"
                      : "pending"
                  }

                  signal={
                    transaction
                      ? `₹${transaction.amount?.toLocaleString(
                          "en-IN"
                        )} → ${transaction.to_account}`
                      : "Awaiting evidence"
                  }

                  observations={
                    transaction
                      ? [
                          "Large transaction initiated.",
                          "Receiving account was evaluated through the entity graph.",
                        ]
                      : []
                  }
                />


                {/* =================================================
                    DEVICE / SESSION
                ================================================= */}

                <EvidencePanel
                  type="device"

                  status={
                    session
                      ? "active"
                      : "pending"
                  }

                  signal={
                    session
                      ? `${session.triggering_feature} · ${Math.round(
                          (session.anomaly_score ?? 0) * 100
                        )}%`
                      : "Awaiting evidence"
                  }

                  observations={
                    session
                      ? [
                          "New-device and session behaviour detected.",
                          `${session.triggering_feature}.`,
                        ]
                      : []
                  }
                />

              </div>

            </section>


            {/* =================================================
                CORRELATION LAYER
            ================================================= */}

            <section className="mt-10">

              <div className="mb-5">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Correlation layer
                </p>

              </div>


              <CorrelationPanel
                status={
                  investigation
                    ? "detected"
                    : result
                      ? "detected"
                      : "pending"
                }

                summary={
                  investigation
                    ? `${correlations.length} cross-stage correlations were recorded as the case progressed.`
                    : result
                      ? `${transitions.length} attack-state transitions were observed as evidence accumulated across the case.`
                      : undefined
                }

                signals={
                  correlationSignals
                }
              />

            </section>


            {/* =================================================
                ENTITY LAYER
            ================================================= */}

            <section className="mt-10">

              <div className="mb-5">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Entity layer
                </p>

              </div>


              <EntityGraphPanel
                connected={
                  Boolean(
                    investigation ||
                    result
                  )
                }
              />

            </section>


            {/* =================================================
                ATTACK STATE
            ================================================= */}

            <section className="mt-10">

              <div className="mb-5">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Attack-state layer
                </p>

              </div>


              <AttackStatePanel
                state={
                  attackState
                }

                confidence={
                  riskScore
                }

                description={
                  investigation
                    ? `The case progressed through ${correlations.length} correlated state transitions and reached ${attackState}.`
                    : result
                      ? `The case progressed through ${transitions.length} correlated state transitions and reached ${attackState}.`
                      : undefined
                }

                indicators={
                  indicators
                }
              />

            </section>


            {/* =================================================
                POLICY DECISION
            ================================================= */}

            <section className="mt-10">

              <div className="mb-5">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Policy layer
                </p>

              </div>


              <DecisionPanel
                decision={
                  decision
                }

                reason={
                  finalAction ??
                  undefined
                }

                actions={
                  finalAction
                    ? [finalAction]
                    : []
                }
              />

            </section>


            {/* =================================================
                EXPLAINABILITY
            ================================================= */}

            {investigation && (

              <section className="mt-10 border border-[#dfe2e6] bg-white">

                <div className="border-b border-[#e5e7eb] px-5 py-4">

                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                    Explainability
                  </p>


                  <h2 className="mt-1 text-lg font-semibold text-[#17191d]">
                    Why PayShield reached this result
                  </h2>

                </div>


                <div className="divide-y divide-[#e5e7eb]">

                  {indicators.map(
                    (item, index) => (

                      <div
                        key={index}
                        className="flex gap-4 px-5 py-4"
                      >

                        <span className="font-mono text-[10px] text-gray-400">
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </span>


                        <p className="text-sm leading-6 text-gray-600">
                          {item.replace(
                            /^\d+\.\s*/,
                            ""
                          )}
                        </p>

                      </div>

                    )
                  )}

                </div>

              </section>

            )}


            {/* =================================================
                DECISION PIPELINE
            ================================================= */}

            <section className="mt-10 mb-10 border border-[#dfe2e6] bg-white">

              <div className="px-5 py-4">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Decision pipeline
                </p>


                <h2 className="mt-1 text-lg font-semibold text-[#17191d]">
                  From evidence to decision
                </h2>

              </div>


              <div className="grid grid-cols-1 divide-y divide-[#e5e7eb] md:grid-cols-4 md:divide-x md:divide-y-0">

                {[
                  [
                    "01",
                    "Evidence",
                    "Independent observations from four evidence streams.",
                  ],

                  [
                    "02",
                    "Correlation",
                    "Cross-stage relationships are evaluated together.",
                  ],

                  [
                    "03",
                    "Attack state",
                    "Correlated evidence contributes to case progression.",
                  ],

                  [
                    "04",
                    "Decision",
                    "Policy logic determines the resulting action.",
                  ],

                ].map(
                  ([
                    number,
                    title,
                    description,
                  ]) => (

                    <div
                      key={number}
                      className="px-5 py-5"
                    >

                      <p className="font-mono text-[10px] text-gray-400">
                        {number}
                      </p>


                      <p className="mt-2 text-sm font-semibold text-[#17191d]">
                        {title}
                      </p>


                      <p className="mt-2 text-xs leading-5 text-gray-500">
                        {description}
                      </p>


                      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.1em] text-[#027a48]">

                        {result
                          ? "Complete"
                          : "Ready"}

                      </p>

                    </div>
                  )
                )}

              </div>


              <div className="border-t border-[#e5e7eb] px-5 py-4">

                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
                  PayShield case engine
                </p>


                <p className="mt-1 text-xs text-gray-500">
                  Evidence remains separated from correlation
                  and policy decision logic.
                </p>

              </div>

            </section>

          </div>

        </div>

      </main>

    </div>
  );
}