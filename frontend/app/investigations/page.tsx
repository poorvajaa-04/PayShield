"use client";

import { useEffect, useMemo, useState } from "react";

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
  identifier_flagged_by_graph?: boolean;
  device_linked_to_flagged_accounts?: string[];
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
  identifier_flagged_by_graph?: boolean;
  device_linked_to_flagged_accounts?: string[];
  action?: string;
  attack_state?: string;
  evidence_count?: number;
}

interface Correlation {
  type: string;
  stream?: string;
  from_state?: string;
  to_state?: string;
  reason?: string;
}

interface Entity {
  id: string;
  kind: string;
  confirmed_mule?: boolean;
  dismissed?: boolean;
  risk_tier?: number;
}

interface Edge {
  source: string;
  target: string;
  kind: string;
  tx_count?: number;
  tx_amount?: number;
  last_ts?: string;
}

interface Investigation {
  case_id: string;
  status: string;
  evidence: Evidence[];
  entities: Entity[];
  edges?: Edge[];
  timeline: TimelineEvent[];
  correlations: Correlation[];
  attack_states?: string[];
  attack_state: string | null;
  risk_index: number | null;
  policy_decision: string | null;
  findings: string[];
}

interface InvestigationSummary {
  case_id: string;
  status: string;
  attack_state?: string | null;
  policy_decision?: string | null;
}

/* =========================================================
   PAGE
========================================================= */

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<
    InvestigationSummary[]
  >([]);

  const [selectedCaseId, setSelectedCaseId] =
    useState<string | null>(null);

  const [investigation, setInvestigation] =
    useState<Investigation | null>(null);

  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingInvestigation, setLoadingInvestigation] =
    useState(false);

  const [error, setError] = useState("");

  /*
   * ---------------------------------------------------------
   * Load all processed investigations
   * ---------------------------------------------------------
   */

  const loadInvestigations = async () => {
    try {
      setLoadingCases(true);
      setError("");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error(
          "NEXT_PUBLIC_API_URL is not configured."
        );
      }

      const response = await fetch(
        `${apiUrl}/investigations`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Investigation cases could not be loaded."
        );
      }

      const data = await response.json();

      /*
       * The backend currently returns:
       *
       * {
       *   value: [...],
       *   Count: n
       * }
       *
       * Keep the frontend tolerant if the backend later
       * returns the array directly.
       */

      const cases: InvestigationSummary[] =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.value)
            ? data.value
            : [];

      setInvestigations(cases);

      /*
       * Preserve the currently selected case if it still
       * exists. Otherwise select the first available case.
       */

      if (cases.length > 0) {
        setSelectedCaseId((current) => {
          if (
            current &&
            cases.some(
              (item) => item.case_id === current
            )
          ) {
            return current;
          }

          return cases[0].case_id;
        });
      } else {
        setSelectedCaseId(null);
        setInvestigation(null);
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load investigations."
      );
    } finally {
      setLoadingCases(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * Initial investigation load
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadInvestigations();
  }, []);

  /*
   * ---------------------------------------------------------
   * Load selected investigation
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedCaseId) {
      setInvestigation(null);
      return;
    }

    const loadSelectedInvestigation = async () => {
      try {
        setLoadingInvestigation(true);
        setError("");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error(
            "NEXT_PUBLIC_API_URL is not configured."
          );
        }

        const response = await fetch(
          `${apiUrl}/investigations/${encodeURIComponent(
            selectedCaseId
          )}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Selected investigation could not be loaded."
          );
        }

        const data =
          (await response.json()) as Investigation;

        setInvestigation(data);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load selected investigation."
        );

        setInvestigation(null);
      } finally {
        setLoadingInvestigation(false);
      }
    };

    loadSelectedInvestigation();
  }, [selectedCaseId]);

  /*
   * ---------------------------------------------------------
   * Header refresh
   * ---------------------------------------------------------
   */

  const handleRefresh = async () => {
    await loadInvestigations();
  };

  /*
   * ---------------------------------------------------------
   * Derived investigation data
   * ---------------------------------------------------------
   */

  const evidence: Evidence[] =
    investigation?.evidence ?? [];

  const timeline: TimelineEvent[] =
    investigation?.timeline ?? [];

  const correlations: Correlation[] =
    investigation?.correlations ?? [];

  const findings: string[] =
    investigation?.findings ?? [];

  const network: Evidence | undefined = evidence.find(
    (item) => item.stream === "network"
  );

  const transaction: Evidence | undefined =
    evidence.find(
      (item) => item.stream === "entity_graph"
    );

  const session: Evidence | undefined = evidence.find(
    (item) => item.stream === "session"
  );

  const lure: Evidence | undefined = evidence.find(
    (item) => item.stream === "lure"
  );

  const observedStreams = evidence.filter(
    (item) =>
      item.stream === "network" ||
      item.stream === "entity_graph" ||
      item.stream === "session" ||
      item.stream === "lure"
  );

  const supportedStreamCount = 4;

  const caseStatus =
    investigation?.policy_decision
      ? "Analysis Complete"
      : investigation?.status ?? "Under Investigation";

  const riskScore =
    investigation?.risk_index ?? null;

  const attackState =
    investigation?.attack_state ?? "NONE";

  const finalDecision =
    investigation?.policy_decision ?? "PENDING";

  const timelineEvents = useMemo(
    () => timeline,
    [timeline]
  );

  return (
    <div className="min-h-screen bg-[#f4f5f6]">
      <Sidebar />

      <main className="ml-64 min-h-screen">
        <Header
          onRun={handleRefresh}
          loading={
            loadingCases ||
            loadingInvestigation
          }
        />

        <div className="px-8 py-8">
          <div className="mx-auto max-w-[1500px]">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                Investigation workspace
              </p>

              <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#17191d]">
                    Investigations
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    Review the complete evidence chain,
                    temporal progression, entity relationships,
                    and policy decision produced by the
                    PayShield case engine.
                  </p>
                </div>

                {investigation && (
                  <div className="flex gap-3">
                    <div className="border border-[#dfe2e6] bg-white px-4 py-3">
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-400">
                        Case
                      </p>

                      <p className="mt-1 font-mono text-sm font-medium text-[#17191d]">
                        {investigation.case_id}
                      </p>
                    </div>

                    <div className="border border-[#dfe2e6] bg-white px-4 py-3">
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-400">
                        Status
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#027a48]">
                        {caseStatus}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="mb-6 border border-[#e5b4b0] bg-[#fff8f7] px-5 py-4">
                <p className="text-sm font-medium text-[#b42318]">
                  {error}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Check that the PayShield backend is running
                  and that the selected investigation exists.
                </p>
              </div>
            )}

            {/* =================================================
                SELECTED INVESTIGATION LOADING
            ================================================= */}

            {loadingInvestigation && (
              <div className="border border-[#dfe2e6] bg-white px-5 py-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Loading investigation
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Retrieving case intelligence from PayShield.
                </p>
              </div>
            )}

            {/* =================================================
                INVESTIGATION
            ================================================= */}

            {investigation &&
              !loadingInvestigation && (
                <>
                  {/* =================================================
                      CASE SUMMARY
                  ================================================= */}

                  <section>
                    <SectionHeader
                      eyebrow="Case intelligence"
                      title="Investigation summary"
                      description="Current state of the case after evidence correlation and policy evaluation."
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="Case status"
                        value={caseStatus}
                        accent="green"
                      />

                      <MetricCard
                        label="Attack state"
                        value={attackState}
                      />

                      <MetricCard
                        label="Policy decision"
                        value={finalDecision}
                      />

                      <MetricCard
                        label="Risk index"
                        value={
                          riskScore !== null
                            ? `${riskScore}/100`
                            : "—"
                        }
                      />
                    </div>
                  </section>

                  {/* =================================================
                      INVESTIGATION CHAIN
                  ================================================= */}

                  <section className="mt-10">
                    <SectionHeader
                      eyebrow="Decision chain"
                      title="From evidence to decision"
                      description="The case moves through distinct analytical stages rather than directly converting one signal into a risk score."
                    />

                    <div className="grid grid-cols-1 border border-[#dfe2e6] bg-white md:grid-cols-4">
                      <PipelineStep
                        number="01"
                        title="Evidence"
                        value={`${observedStreams.length} observed / ${supportedStreamCount} supported`}
                        description="Independent observations are collected without combining their meaning prematurely."
                      />

                      <PipelineStep
                        number="02"
                        title="Correlation"
                        value={`${correlations.length} transitions`}
                        description="Evidence from separate stages is related as the case progresses."
                      />

                      <PipelineStep
                        number="03"
                        title="Attack state"
                        value={attackState}
                        description="Correlated evidence is interpreted as a temporal attack progression."
                      />

                      <PipelineStep
                        number="04"
                        title="Decision"
                        value={finalDecision}
                        description="Policy logic determines the action associated with the resulting state."
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
                      description={`${observedStreams.length} of ${supportedStreamCount} supported evidence streams produced observations in this case.`}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <EvidenceCard
                        title="Lure / Social Engineering"
                        stream="lure"
                        evidence={lure}
                        description="Messages, impersonation and coercion signals."
                      />

                      <EvidenceCard
                        title="Network"
                        stream="network"
                        evidence={network}
                        description="Traffic behaviour and connection anomalies."
                      />

                      <EvidenceCard
                        title="Device / Session"
                        stream="session"
                        evidence={session}
                        description="Device identity and behavioural context."
                      />

                      <EvidenceCard
                        title="Transaction / Entity Graph"
                        stream="entity_graph"
                        evidence={transaction}
                        description="Payment behaviour and graph-derived entity evidence."
                      />
                    </div>
                  </section>

                  {/* =================================================
                      CORRELATION
                  ================================================= */}

                  <section className="mt-10">
                    <SectionHeader
                      eyebrow="Correlation layer"
                      title="Cross-stage attack progression"
                      description="Relationships between independent evidence streams that caused the case state to progress."
                    />

                    <div className="border border-[#dfe2e6] bg-white">
                      {correlations.length === 0 ? (
                        <div className="px-5 py-7 text-sm text-gray-500">
                          No cross-stage correlations recorded.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#e5e7eb]">
                          {correlations.map(
                            (correlation, index) => (
                              <CorrelationRow
                                key={`${correlation.type}-${index}`}
                                index={index}
                                correlation={correlation}
                              />
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
                      description="Evidence observations, state transitions and policy actions recorded during case progression."
                    />

                    <div className="border border-[#dfe2e6] bg-white">
                      {timelineEvents.length === 0 ? (
                        <div className="px-5 py-7 text-sm text-gray-500">
                          No timeline events recorded.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#e5e7eb]">
                          {timelineEvents.map(
                            (event, index) => (
                              <TimelineRow
                                key={`${event.t}-${event.event}-${index}`}
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
                      title="Entity relationships"
                      description="Graph-derived information used to evaluate the receiving account and its structural context."
                    />

                    <div className="border border-[#dfe2e6] bg-white">
                      <div className="grid grid-cols-1 divide-y divide-[#e5e7eb] md:grid-cols-3 md:divide-x md:divide-y-0">

                        <div className="px-5 py-6">
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                            Graph entities
                          </p>

                          <p className="mt-2 text-2xl font-semibold text-[#17191d]">
                            {investigation.entities.length}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Entities returned by the investigation.
                          </p>
                        </div>

                        <div className="px-5 py-6">
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                            Recipient
                          </p>

                          <p className="mt-2 break-all font-mono text-sm text-[#17191d]">
                            {transaction?.to_account ??
                              "Not available"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Account evaluated by the entity graph.
                          </p>
                        </div>

                        <div className="px-5 py-6">
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                            PageRank
                          </p>

                          <p className="mt-2 text-2xl font-semibold text-[#17191d]">
                            {typeof transaction?.pagerank ===
                            "number"
                              ? transaction.pagerank.toFixed(4)
                              : "—"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            PageRank for the evaluated recipient.
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-[#e5e7eb] px-5 py-5">
                        <div className="flex flex-wrap gap-2">
                          {transaction?.is_structural_hub !==
                            undefined && (
                            <EvidenceTag
                              label={
                                transaction.is_structural_hub
                                  ? "Structural hub"
                                  : "Not a structural hub"
                              }
                            />
                          )}

                          {transaction?.community_id !==
                            undefined &&
                            transaction.community_id !==
                              null && (
                              <EvidenceTag
                                label={`Community #${transaction.community_id}`}
                              />
                            )}

                          {typeof transaction?.betweenness ===
                            "number" && (
                            <EvidenceTag
                              label={`Betweenness ${transaction.betweenness.toFixed(
                                4
                              )}`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* =================================================
                      ATTACK STATE
                  ================================================= */}

                  <section className="mt-10">
                    <SectionHeader
                      eyebrow="Attack-state layer"
                      title="Current attack state"
                      description="The state reached after interpreting the correlated evidence across the case timeline."
                    />

                    <div className="border border-[#17191d] bg-[#17191d] px-6 py-6 text-white">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                            State identified
                          </p>

                          <p className="mt-3 text-3xl font-semibold tracking-tight">
                            {attackState}
                          </p>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                            The case reached this state after
                            cross-stage evidence was correlated
                            across the investigation timeline.
                          </p>
                        </div>

                        <div className="min-w-[130px] border border-white/20 px-4 py-4">
                          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-400">
                            Risk index
                          </p>

                          <p className="mt-2 text-3xl font-semibold">
                            {riskScore !== null
                              ? `${riskScore}/100`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
                        <StateNode label="Observed" />

                        <StateArrow />

                        <StateNode label="Correlated" />

                        <StateArrow />

                        <StateNode
                          label={attackState}
                          active
                        />

                        <StateArrow />

                        <StateNode label={finalDecision} />
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
                      description="Evidence-backed findings associated with the current attack state."
                    />

                    <div className="border border-[#dfe2e6] bg-white">
                      {findings.length === 0 ? (
                        <div className="px-5 py-7 text-sm text-gray-500">
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
                                  {String(index + 1).padStart(
                                    2,
                                    "0"
                                  )}
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
                      FINAL DECISION
                  ================================================= */}

                  <section className="mt-10">
                    <SectionHeader
                      eyebrow="Policy layer"
                      title="Final decision"
                      description="The policy outcome produced after attack-state assessment."
                    />

                    <div className="border border-[#17191d] bg-[#17191d] px-6 py-7 text-white">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                            Decision engine
                          </p>

                          <p className="mt-3 text-3xl font-semibold tracking-tight">
                            {finalDecision}
                          </p>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                            The policy engine evaluated the resulting
                            attack state and selected the corresponding
                            case action.
                          </p>
                        </div>

                        <div className="border border-white/20 px-5 py-4">
                          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-400">
                            Action
                          </p>

                          <p className="mt-2 text-lg font-semibold">
                            {formatDecision(finalDecision)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* =================================================
                      CASE REGISTRY
                      -------------------------------------------------
                      Deliberately placed at the END.

                      The investigator first reviews the currently
                      selected case from evidence through decision.
                      The registry is then used to move to another
                      case or review case history.
                  ================================================= */}

                  <section className="mt-10 mb-10">
                    <SectionHeader
                      eyebrow="Case registry"
                      title="Investigation cases"
                      description="Select another processed case to continue or review a different investigation."
                    />

                    <div className="border border-[#dfe2e6] bg-white">
                      {loadingCases ? (
                        <div className="px-5 py-7">
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                            Loading cases
                          </p>

                          <p className="mt-2 text-sm text-gray-500">
                            Retrieving processed investigations
                            from PayShield.
                          </p>
                        </div>
                      ) : investigations.length === 0 ? (
                        <div className="px-5 py-8">
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                            No processed cases
                          </p>

                          <p className="mt-2 text-sm text-gray-500">
                            Run a case from the Overview page before
                            opening the investigation workspace.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#e5e7eb]">
                          {investigations.map((item) => {
                            const selected =
                              item.case_id === selectedCaseId;

                            const itemAttackState =
                              item.attack_state ?? "NONE";

                            const itemDecision =
                              item.policy_decision ?? "PENDING";

                            return (
                              <button
                                key={item.case_id}
                                type="button"
                                onClick={() =>
                                  setSelectedCaseId(
                                    item.case_id
                                  )
                                }
                                className={`block w-full text-left transition ${
                                  selected
                                    ? "bg-[#f8f9fa]"
                                    : "bg-white hover:bg-[#fafafa]"
                                }`}
                              >
                                <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="flex min-w-0 items-start gap-4">
                                    <div
                                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                        selected
                                          ? "bg-[#17191d]"
                                          : "bg-[#c7cbd1]"
                                      }`}
                                    />

                                    <div className="min-w-0">
                                      <p className="font-mono text-sm font-semibold text-[#17191d]">
                                        {item.case_id}
                                      </p>

                                      <p className="mt-1 text-xs text-gray-500">
                                        {item.status ??
                                          "Under Investigation"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <RegistryTag
                                      label={itemAttackState}
                                    />

                                    <RegistryTag
                                      label={itemDecision}
                                    />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {!loadingCases &&
              !loadingInvestigation &&
              !investigation &&
              investigations.length === 0 &&
              !error && (
                <div className="border border-[#dfe2e6] bg-white px-5 py-8">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                    No investigation selected
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Run a case from the Overview page before
                    opening the investigation workspace.
                  </p>
                </div>
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

      <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
        {description}
      </p>
    </div>
  );
}


/* =========================================================
   REGISTRY TAG
========================================================= */

function RegistryTag({
  label,
}: {
  label: string;
}) {
  return (
    <span className="border border-[#dfe2e6] bg-[#f8f9fa] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-gray-500">
      {label}
    </span>
  );
}


/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green";
}) {
  return (
    <div className="border border-[#dfe2e6] bg-white px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p
        className={`mt-3 break-words text-lg font-semibold ${
          accent === "green"
            ? "text-[#027a48]"
            : "text-[#17191d]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}


/* =========================================================
   PIPELINE STEP
========================================================= */

function PipelineStep({
  number,
  title,
  value,
  description,
}: {
  number: string;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="border-b border-[#e5e7eb] px-5 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <p className="font-mono text-[10px] text-gray-400">
        {number}
      </p>

      <p className="mt-2 text-sm font-semibold text-[#17191d]">
        {title}
      </p>

      <p className="mt-2 break-words font-mono text-xs text-[#17191d]">
        {value}
      </p>

      <p className="mt-3 text-xs leading-5 text-gray-500">
        {description}
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
  description,
}: {
  title: string;
  stream: string;
  evidence?: Evidence;
  description: string;
}) {
  if (!evidence) {
    return (
      <div className="border border-[#dfe2e6] bg-white px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#17191d]">
              {title}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              {description}
            </p>
          </div>

          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
            No data
          </span>
        </div>

        <div className="mt-5 border border-dashed border-[#dfe2e6] bg-[#fafafa] px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400">
            {stream}
          </p>

          <p className="mt-2 text-sm text-gray-400">
            This stream was not activated by the current case dataset.
          </p>
        </div>
      </div>
    );
  }

  const probability =
    evidence.probability ??
    evidence.anomaly_score;

  return (
    <div className="border border-[#dfe2e6] bg-white px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#17191d]">
            {title}
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            {description}
          </p>
        </div>

        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[#027a48]">
          Active
        </span>
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400">
        {stream}
      </p>

      {probability !== undefined && (
        <div className="mt-3">
          <p className="text-2xl font-semibold text-[#17191d]">
            {Math.round(probability * 100)}%
          </p>

          <p className="text-xs text-gray-400">
            Signal strength
          </p>
        </div>
      )}

      {evidence.matched_pattern && (
        <p className="mt-4 text-sm leading-6 text-gray-600">
          {evidence.matched_pattern}
        </p>
      )}

      {evidence.triggering_feature && (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {evidence.triggering_feature}
        </p>
      )}

      {evidence.amount !== undefined && (
        <p className="mt-4 text-sm text-gray-600">
          Amount:{" "}
          <span className="font-semibold text-[#17191d]">
            ₹{evidence.amount.toLocaleString("en-IN")}
          </span>
        </p>
      )}

      {evidence.to_account && (
        <p className="mt-1 break-all font-mono text-xs text-gray-500">
          → {evidence.to_account}
        </p>
      )}

      {evidence.is_structural_hub !== undefined && (
        <p className="mt-4 text-xs text-gray-500">
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
   CORRELATION ROW
========================================================= */

function CorrelationRow({
  index,
  correlation,
}: {
  index: number;
  correlation: Correlation;
}) {
  return (
    <div className="px-5 py-5">
      <div className="flex items-start gap-4">
        <span className="font-mono text-[10px] text-gray-400">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
              {correlation.stream ?? "correlator"}
            </span>

            {correlation.from_state &&
              correlation.to_state && (
                <span className="font-mono text-sm font-semibold text-[#17191d]">
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
    <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-[110px_190px_1fr] md:gap-5">
      <div>
        <p className="font-mono text-xs font-medium text-[#17191d]">
          {formatTimestamp(event.t)}
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
        {event.from_state &&
          event.to && (
            <p className="text-sm leading-6 text-gray-600">
              {event.from_state}
              {" → "}
              {event.to}
            </p>
          )}

        {event.reason && (
          <p className="text-sm leading-6 text-gray-600">
            {event.reason}
          </p>
        )}

        {!event.reason &&
          !(event.from_state && event.to) &&
          event.matched_pattern && (
            <p className="text-sm leading-6 text-gray-600">
              {event.matched_pattern}
            </p>
          )}

        {!event.reason &&
          !(event.from_state && event.to) &&
          !event.matched_pattern &&
          event.amount !== undefined && (
            <p className="text-sm text-gray-600">
              ₹{event.amount.toLocaleString("en-IN")}
              {event.to_account
                ? ` → ${event.to_account}`
                : ""}
            </p>
          )}

        {event.event === "orchestrator_decision" && (
          <div className="flex flex-wrap gap-2">
            {event.action && (
              <EvidenceTag
                label={`Action: ${event.action}`}
              />
            )}

            {event.attack_state && (
              <EvidenceTag
                label={`State: ${event.attack_state}`}
              />
            )}

            {event.evidence_count !== undefined && (
              <EvidenceTag
                label={`Evidence: ${event.evidence_count}`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}


/* =========================================================
   TIMESTAMP
========================================================= */

function formatTimestamp(timestamp: string) {
  if (!timestamp) {
    return "—";
  }

  if (/^\d+$/.test(timestamp)) {
    return `T+${timestamp} min`;
  }

  return timestamp;
}


/* =========================================================
   EVENT NAME
========================================================= */

function formatEventName(event: string) {
  return event
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


/* =========================================================
   DECISION LABEL
========================================================= */

function formatDecision(decision: string) {
  if (decision === "TRANSACTION_HOLD") {
    return "Transaction Hold";
  }

  if (decision === "BLOCK") {
    return "Block";
  }

  if (decision === "ALLOW") {
    return "Allow";
  }

  return decision;
}


/* =========================================================
   EVIDENCE TAG
========================================================= */

function EvidenceTag({
  label,
}: {
  label: string;
}) {
  return (
    <span className="border border-[#dfe2e6] bg-[#f8f9fa] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-gray-500">
      {label}
    </span>
  );
}


/* =========================================================
   STATE NODE
========================================================= */

function StateNode({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.08em] ${
        active
          ? "border-white bg-white text-[#17191d]"
          : "border-white/20 text-gray-300"
      }`}
    >
      {label}
    </span>
  );
}


/* =========================================================
   STATE ARROW
========================================================= */

function StateArrow() {
  return (
    <span className="font-mono text-xs text-gray-500">
      →
    </span>
  );
}