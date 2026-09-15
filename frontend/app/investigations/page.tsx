"use client";

import { useEffect, useState } from "react";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

interface Evidence {
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

interface TimelineEvent {
  t: string;
  event: string;
  stream?: string;
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

interface Correlation {
  type: string;
  stream?: string;
  from_state?: string;
  to_state?: string;
  reason?: string;
}

interface Investigation {
  case_id: string;
  status: string;
  evidence: Evidence[];
  entities: Record<string, unknown>[];
  timeline: TimelineEvent[];
  correlations: Correlation[];
  attack_state: string | null;
  risk_index: number | null;
  policy_decision: string | null;
  findings: string[];
}

export default function InvestigationsPage() {
  const [investigation, setInvestigation] =
    useState<Investigation | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvestigation = async () => {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error(
            "NEXT_PUBLIC_API_URL is not configured."
          );
        }

        const response = await fetch(
          `${apiUrl}/investigations/PS-REAL-001`
        );

        if (!response.ok) {
          throw new Error(
            "Investigation could not be loaded."
          );
        }

        const data: Investigation =
          await response.json();

        setInvestigation(data);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load investigation."
        );
      } finally {
        setLoading(false);
      }
    };

    loadInvestigation();
  }, []);

  const evidence =
    investigation?.evidence ?? [];

  const timeline =
    investigation?.timeline ?? [];

  const correlations =
    investigation?.correlations ?? [];

  const findings =
    investigation?.findings ?? [];

  const network =
    evidence.find(
      (item) => item.stream === "network"
    );

  const transaction =
    evidence.find(
      (item) => item.stream === "entity_graph"
    );

  const session =
    evidence.find(
      (item) => item.stream === "session"
    );

  const lure =
    evidence.find(
      (item) => item.stream === "lure"
    );

  return (
    <div className="min-h-screen bg-[#f4f5f6]">

      <Sidebar />

      <main className="ml-64 min-h-screen">

        <Header
          onRun={() => window.location.reload()}
          loading={loading}
        />

        <div className="px-8 py-8">

          <div className="mx-auto max-w-[1500px]">

            {/* PAGE HEADER */}

            <div className="mb-8">

              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                Investigation workspace
              </p>

              <div className="mt-2 flex items-end justify-between">

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#17191d]">
                    Investigations
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    Review the complete evidence chain,
                    temporal progression, and policy decision
                    produced by the PayShield case engine.
                  </p>
                </div>

                {investigation && (
                  <div className="border border-[#dfe2e6] bg-white px-4 py-3">

                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-400">
                      Case
                    </p>

                    <p className="mt-1 font-mono text-sm font-medium text-[#17191d]">
                      {investigation.case_id}
                    </p>

                  </div>
                )}

              </div>

            </div>


            {/* ERROR */}

            {error && (
              <div className="mb-6 border border-[#e5b4b0] bg-[#fff8f7] px-5 py-4">

                <p className="text-sm font-medium text-[#b42318]">
                  {error}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Run the case from the Overview page first,
                  then return here.
                </p>

              </div>
            )}


            {/* LOADING */}

            {loading && (
              <div className="border border-[#dfe2e6] bg-white px-5 py-8">

                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Loading investigation
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Retrieving case intelligence from PayShield.
                </p>

              </div>
            )}


            {investigation && (

              <>

                {/* =================================================
                    CASE STATE
                ================================================= */}

                <section>

                  <div className="mb-4">

                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                      Case intelligence
                    </p>

                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

                    <MetricCard
                      label="Status"
                      value={investigation.status}
                    />

                    <MetricCard
                      label="Attack state"
                      value={
                        investigation.attack_state ??
                        "NONE"
                      }
                    />

                    <MetricCard
                      label="Policy decision"
                      value={
                        investigation.policy_decision ??
                        "PENDING"
                      }
                    />

                    <MetricCard
                      label="Evidence streams"
                      value={String(evidence.length)}
                    />

                  </div>

                </section>


                {/* =================================================
                    EVIDENCE
                ================================================= */}

                <section className="mt-10">

                  <SectionHeader
                    eyebrow="Evidence layer"
                    title="Evidence streams"
                    description="Independent observations contributing to the case."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <EvidenceCard
                      title="Lure"
                      stream="lure"
                      evidence={lure}
                    />

                    <EvidenceCard
                      title="Network"
                      stream="network"
                      evidence={network}
                    />

                    <EvidenceCard
                      title="Session"
                      stream="session"
                      evidence={session}
                    />

                    <EvidenceCard
                      title="Entity graph"
                      stream="entity_graph"
                      evidence={transaction}
                    />

                  </div>

                </section>


                {/* =================================================
                    CORRELATION
                ================================================= */}

                <section className="mt-10">

                  <SectionHeader
                    eyebrow="Correlation layer"
                    title="Attack-state progression"
                    description="State transitions produced by cross-stage correlation."
                  />

                  <div className="border border-[#dfe2e6] bg-white">

                    {correlations.length === 0 ? (

                      <div className="px-5 py-6 text-sm text-gray-500">
                        No cross-stage correlations recorded.
                      </div>

                    ) : (

                      <div className="divide-y divide-[#e5e7eb]">

                        {correlations.map(
                          (correlation, index) => (

                            <div
                              key={index}
                              className="px-5 py-5"
                            >

                              <div className="flex items-start gap-4">

                                <span className="font-mono text-[10px] text-gray-400">
                                  {String(
                                    index + 1
                                  ).padStart(2, "0")}
                                </span>

                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                                      {correlation.stream ??
                                        "correlation"}
                                    </span>

                                    {correlation.from_state &&
                                      correlation.to_state && (
                                        <span className="text-sm font-semibold text-[#17191d]">
                                          {correlation.from_state}
                                          {" → "}
                                          {correlation.to_state}
                                        </span>
                                      )}

                                  </div>

                                  {correlation.reason && (
                                    <p className="mt-2 text-sm leading-6 text-gray-600">
                                      {correlation.reason}
                                    </p>
                                  )}

                                </div>

                              </div>

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                </section>


                {/* =================================================
                    TIMELINE
                ================================================= */}

                <section className="mt-10">

                  <SectionHeader
                    eyebrow="Temporal case model"
                    title="Investigation timeline"
                    description="Timestamped events recorded while the case progressed."
                  />

                  <div className="border border-[#dfe2e6] bg-white">

                    {timeline.length === 0 ? (

                      <div className="px-5 py-6 text-sm text-gray-500">
                        No timeline events recorded.
                      </div>

                    ) : (

                      <div className="divide-y divide-[#e5e7eb]">

                        {timeline.map(
                          (event, index) => (

                            <TimelineRow
                              key={index}
                              event={event}
                            />

                          )
                        )}

                      </div>

                    )}

                  </div>

                </section>


                {/* =================================================
                    ENTITY GRAPH
                ================================================= */}

                <section className="mt-10">

                  <SectionHeader
                    eyebrow="Entity layer"
                    title="Graph evidence"
                    description="Entities used by the investigation graph."
                  />

                  <div className="border border-[#dfe2e6] bg-white">

                    <div className="grid grid-cols-1 divide-y divide-[#e5e7eb] md:grid-cols-3 md:divide-x md:divide-y-0">

                      <div className="px-5 py-5">

                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                          Nodes
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-[#17191d]">
                          {investigation.entities.length}
                        </p>

                      </div>

                      <div className="px-5 py-5">

                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                          Recipient
                        </p>

                        <p className="mt-2 font-mono text-sm text-[#17191d]">
                          {transaction?.to_account ??
                            "Not available"}
                        </p>

                      </div>

                      <div className="px-5 py-5">

                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                          PageRank
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-[#17191d]">
                          {transaction?.pagerank !== undefined
                            ? transaction.pagerank.toFixed(4)
                            : "—"}
                        </p>

                      </div>

                    </div>

                  </div>

                </section>


                {/* =================================================
                    FINDINGS
                ================================================= */}

                <section className="mt-10">

                  <SectionHeader
                    eyebrow="Explainability"
                    title="Why PayShield reached this result"
                    description="Evidence-backed findings generated by the investigation engine."
                  />

                  <div className="border border-[#dfe2e6] bg-white">

                    {findings.length === 0 ? (

                      <div className="px-5 py-6 text-sm text-gray-500">
                        No findings were generated.
                      </div>

                    ) : (

                      <div className="divide-y divide-[#e5e7eb]">

                        {findings.map(
                          (finding, index) => (

                            <div
                              key={index}
                              className="flex gap-4 px-5 py-5"
                            >

                              <span className="font-mono text-[10px] text-gray-400">
                                {String(
                                  index + 1
                                ).padStart(2, "0")}
                              </span>

                              <p className="text-sm leading-6 text-gray-600">
                                {finding.replace(
                                  /^\d+\.\s*/,
                                  ""
                                )}
                              </p>

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                </section>


                {/* =================================================
                    DECISION
                ================================================= */}

                <section className="mt-10 mb-10">

                  <SectionHeader
                    eyebrow="Policy layer"
                    title="Final decision"
                    description="The orchestrator's policy outcome for the correlated case."
                  />

                  <div className="border border-[#17191d] bg-[#17191d] px-6 py-6 text-white">

                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                      Decision engine
                    </p>

                    <p className="mt-3 text-2xl font-semibold">
                      {investigation.policy_decision ??
                        "PENDING"}
                    </p>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                      PayShield separated evidence collection,
                      cross-stage correlation, attack-state
                      assessment, and policy decision into
                      distinct stages.
                    </p>

                  </div>

                </section>

              </>

            )}

          </div>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-semibold text-[#17191d]">
        {title}
      </h2>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>

    </div>
  );
}


/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#dfe2e6] bg-white px-5 py-5">

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p className="mt-3 break-words text-lg font-semibold text-[#17191d]">
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   EVIDENCE CARD
========================================================= */

function EvidenceCard({
  title,
  stream,
  evidence,
}: {
  title: string;
  stream: string;
  evidence?: Evidence;
}) {
  if (!evidence) {
    return (
      <div className="border border-[#dfe2e6] bg-white px-5 py-5">

        <div className="flex items-center justify-between">

          <h3 className="text-sm font-semibold text-[#17191d]">
            {title}
          </h3>

          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
            Pending
          </span>

        </div>

        <p className="mt-3 text-sm text-gray-400">
          No evidence recorded for this stream.
        </p>

      </div>
    );
  }

  const probability =
    evidence.probability ??
    evidence.anomaly_score;

  return (
    <div className="border border-[#dfe2e6] bg-white px-5 py-5">

      <div className="flex items-center justify-between">

        <h3 className="text-sm font-semibold text-[#17191d]">
          {title}
        </h3>

        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#027a48]">
          Active
        </span>

      </div>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400">
        {stream}
      </p>

      {probability !== undefined && (
        <div className="mt-3">

          <p className="text-2xl font-semibold text-[#17191d]">
            {Math.round(probability * 100)}%
          </p>

          <p className="text-xs text-gray-400">
            Signal probability
          </p>

        </div>
      )}

      {evidence.matched_pattern && (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {evidence.matched_pattern}
        </p>
      )}

      {evidence.triggering_feature && (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {evidence.triggering_feature}
        </p>
      )}

      {evidence.amount !== undefined && (
        <p className="mt-3 text-sm text-gray-600">
          Amount:{" "}
          <span className="font-semibold text-[#17191d]">
            ₹{evidence.amount.toLocaleString("en-IN")}
          </span>
        </p>
      )}

      {evidence.to_account && (
        <p className="mt-1 font-mono text-xs text-gray-500">
          → {evidence.to_account}
        </p>
      )}

      {evidence.is_structural_hub !== undefined && (
        <p className="mt-3 text-xs text-gray-500">
          Structural hub:{" "}
          <span className="font-medium text-[#17191d]">
            {evidence.is_structural_hub
              ? "Yes"
              : "No"}
          </span>
        </p>
      )}

    </div>
  );
}


/* =========================================================
   TIMELINE ROW
========================================================= */

function TimelineRow({
  event,
}: {
  event: TimelineEvent;
}) {
  return (
    <div className="grid grid-cols-[90px_180px_1fr] gap-5 px-5 py-5">

      <div>
        <p className="font-mono text-xs text-[#17191d]">
          {event.t}
        </p>
      </div>

      <div>

        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
          {event.stream ?? "system"}
        </p>

        <p className="mt-1 text-sm font-medium text-[#17191d]">
          {formatEventName(event.event)}
        </p>

      </div>

      <div>

        {event.reason && (
          <p className="text-sm leading-6 text-gray-600">
            {event.reason}
          </p>
        )}

        {!event.reason &&
          event.matched_pattern && (
            <p className="text-sm leading-6 text-gray-600">
              {event.matched_pattern}
            </p>
          )}

        {!event.reason &&
          !event.matched_pattern &&
          event.amount !== undefined && (
            <p className="text-sm text-gray-600">
              ₹{event.amount.toLocaleString("en-IN")}
              {event.to_account
                ? ` → ${event.to_account}`
                : ""}
            </p>
          )}

      </div>

    </div>
  );
}


/* =========================================================
   EVENT LABEL
========================================================= */

function formatEventName(
  event: string
) {
  return event
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase()
    );
}