"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CaseSummary from "@/components/CaseSummary";
import EvidencePanel from "@/components/EvidencePanel";
import CorrelationPanel from "@/components/CorrelationPanel";
import AttackStatePanel from "@/components/AttackStatePanel";
import EntityGraphPanel from "@/components/EntityGraphPanel";
import DecisionPanel from "@/components/DecisionPanel";

export default function Home() {
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);

    // Temporary placeholder.
    // This will later call the PayShield FastAPI backend.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f6]">

      {/* Sidebar */}
      <Sidebar />

      {/* Main application */}
      <main className="ml-64 min-h-screen">

        {/* Header */}
        <Header
          onRun={handleRun}
          loading={loading}
        />

        {/* Main content */}
        <div className="px-8 py-8">

          <div className="mx-auto max-w-[1500px]">

            {/* =====================================================
                PAGE HEADING
            ====================================================== */}

            <div className="mb-8">

              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                Investigation workspace
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17191d]">
                Case intelligence
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Review how independent evidence streams combine into
                an attack-state assessment and policy decision.
              </p>

            </div>


            {/* =====================================================
                CASE SUMMARY
            ====================================================== */}

            <CaseSummary />


            {/* =====================================================
                EVIDENCE STREAMS
            ====================================================== */}

            <section className="mt-8">

              <div className="mb-4 flex items-end justify-between">

                <div>

                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                    Evidence layer
                  </p>

                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#17191d]">
                    Evidence streams
                  </h2>

                </div>

                <p className="text-xs text-gray-400">
                  Independent signals · 4 streams
                </p>

              </div>


              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

                <EvidencePanel
                  type="lure"
                  status="pending"
                  signal="No analysis performed"
                  observations={[
                    "Message and impersonation evidence will appear here.",
                    "Coercion and credential-request indicators are evaluated independently.",
                  ]}
                />

                <EvidencePanel
                  type="network"
                  status="pending"
                  signal="No analysis performed"
                  observations={[
                    "Network behaviour will be evaluated from supplied telemetry.",
                    "Connection and request patterns remain independent from transaction evidence.",
                  ]}
                />

                <EvidencePanel
                  type="transaction"
                  status="pending"
                  signal="No analysis performed"
                  observations={[
                    "Transaction behaviour will be evaluated against the case context.",
                    "Amount, velocity and related payment signals will appear here.",
                  ]}
                />

                <EvidencePanel
                  type="device"
                  status="pending"
                  signal="No analysis performed"
                  observations={[
                    "Device identity and behavioural context will appear here.",
                    "Device relationships can later contribute to cross-entity correlation.",
                  ]}
                />

              </div>

            </section>


            {/* =====================================================
                CORRELATION LAYER
            ====================================================== */}

            <section className="mt-8">

              <div className="mb-4">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Correlation layer
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#17191d]">
                  Cross-stage correlation
                </h2>

              </div>


              <CorrelationPanel />

            </section>


            {/* =====================================================
                ENTITY GRAPH
            ====================================================== */}

            <section className="mt-8">

              <div className="mb-4">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Entity layer
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#17191d]">
                  Entity relationships
                </h2>

              </div>


              <EntityGraphPanel />

            </section>


            {/* =====================================================
                ATTACK STATE
            ====================================================== */}

            <section className="mt-8">

              <div className="mb-4">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Attack-state layer
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#17191d]">
                  Attack progression
                </h2>

              </div>


              <AttackStatePanel />

            </section>


            {/* =====================================================
                POLICY DECISION
            ====================================================== */}

            <section className="mt-8">

              <div className="mb-4">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Policy layer
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#17191d]">
                  Final policy decision
                </h2>

              </div>


              <DecisionPanel />

            </section>


            {/* =====================================================
                DECISION PIPELINE
            ====================================================== */}

            <section className="mt-8">

              <div className="mb-4">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  Decision pipeline
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#17191d]">
                  From evidence to decision
                </h2>

              </div>


              <div className="border border-[#dfe2e6] bg-white">

                <div className="grid grid-cols-1 divide-y divide-[#e5e7eb] md:grid-cols-4 md:divide-x md:divide-y-0">

                  <PipelineStage
                    number="01"
                    title="Evidence"
                    description="Independent observations from four evidence streams."
                    state="Ready"
                  />

                  <PipelineStage
                    number="02"
                    title="Correlation"
                    description="Cross-stage relationships are evaluated together."
                    state="Pending"
                  />

                  <PipelineStage
                    number="03"
                    title="Attack state"
                    description="Correlated evidence contributes to case progression."
                    state="Pending"
                  />

                  <PipelineStage
                    number="04"
                    title="Decision"
                    description="Policy logic determines the resulting action."
                    state="Pending"
                  />

                </div>

              </div>

            </section>


            {/* =====================================================
                FOOTER
            ====================================================== */}

            <div className="mt-8 flex items-center justify-between border-t border-[#dfe2e6] py-5">

              <div>

                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-gray-400">
                  PayShield case engine
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Evidence remains separated from correlation and
                  policy decision logic.
                </p>

              </div>


              <div className="font-mono text-[10px] text-gray-400">
                CASE-2026-0142
              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}


/* =============================================================
   PIPELINE STAGE
============================================================= */

function PipelineStage({
  number,
  title,
  description,
  state,
}: {
  number: string;
  title: string;
  description: string;
  state: string;
}) {
  return (
    <div className="min-h-[170px] p-5">

      <div className="flex items-start justify-between">

        <span className="font-mono text-[10px] tracking-[0.12em] text-gray-400">
          {number}
        </span>

        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
          {state}
        </span>

      </div>


      <h3 className="mt-8 text-sm font-semibold text-[#17191d]">
        {title}
      </h3>


      <p className="mt-2 text-xs leading-5 text-gray-500">
        {description}
      </p>

    </div>
  );
}