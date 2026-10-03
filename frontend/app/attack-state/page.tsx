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
  to_state?: string;
  reason?: string;
  probability?: number;
  anomaly_score?: number;
  matched_pattern?: string;
  triggering_feature?: string;
  amount?: number;
  to_account?: string;
  identifier_flagged_by_graph?: boolean;
  device_linked_to_flagged_accounts?: string[];
  community_id?: number | null;
  confirmed_mules_in_community?: string[];
  is_confirmed_mule?: boolean;
  is_structural_hub?: boolean;
  pagerank?: number;
  betweenness?: number;
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
  entities: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  timeline: TimelineEvent[];
  correlations: Correlation[];
  attack_states: string[];
  attack_state: string | null;
  risk_index: number | null;
  policy_decision: string | null;
  findings: string[];
}

interface StateNode {
  state: string;
  reached: boolean;
  current: boolean;
  isStart: boolean;
}

export default function AttackStatePage() {
  const [investigation, setInvestigation] =
    useState<Investigation | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvestigation = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error(
            "NEXT_PUBLIC_API_URL is not configured."
          );
        }

        const response = await fetch(
          `${apiUrl.replace(/\/$/, "")}/investigations/PS-REAL-001`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Investigation could not be loaded (${response.status}).`
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
            : "Failed to load investigation."
        );
      } finally {
        setLoading(false);
      }
    };

    loadInvestigation();
  }, []);

  const evidence = investigation?.evidence ?? [];
  const timeline = investigation?.timeline ?? [];
  const correlations = investigation?.correlations ?? [];

  const attackState =
    investigation?.attack_state ?? "NONE";

  const finalDecision =
    investigation?.policy_decision ?? "PENDING";

  /*
   * The backend remains the source of truth for
   * the attack-state vocabulary.
   */
  const canonicalStates =
    investigation?.attack_states ?? [];

  /*
   * A transition is considered valid when it is an
   * attack-state transition and contains both endpoints.
   *
   * Backend versions may expose the destination as
   * either `to` or `to_state`, so the frontend
   * normalizes that difference without inventing
   * any new state.
   */
  const stateTransitions = useMemo(() => {
    return timeline
      .filter(
        (event) =>
          event.event === "attack_state_transition" &&
          Boolean(event.from_state) &&
          Boolean(event.to ?? event.to_state)
      )
      .map((event) => ({
        ...event,
        to: event.to ?? event.to_state,
      }));
  }, [timeline]);

  /*
   * Build display-only progression information from
   * the backend-provided state vocabulary and the
   * investigation's actual transition history.
   */
  const progression = useMemo<StateNode[]>(() => {
    if (canonicalStates.length === 0) {
      return [];
    }

    const reachedStates = new Set<string>();

    for (const transition of stateTransitions) {
      if (transition.from_state) {
        reachedStates.add(transition.from_state);
      }

      if (transition.to) {
        reachedStates.add(transition.to);
      }
    }

    if (attackState) {
      reachedStates.add(attackState);
    }

    return canonicalStates.map((state) => ({
      state,
      reached: reachedStates.has(state),
      current: state === attackState,
      isStart: state === "NONE",
    }));
  }, [
    canonicalStates,
    stateTransitions,
    attackState,
  ]);

  /*
   * NONE represents the initial state rather than
   * an attack stage.
   */
  const attackStages = progression.filter(
    (node) => !node.isStart
  );

  const reachedAttackStages =
    attackStages.filter(
      (node) => node.reached
    ).length;

  const currentStageIndex =
    attackStages.findIndex(
      (node) => node.current
    );

  const currentStageNumber =
    currentStageIndex >= 0
      ? currentStageIndex + 1
      : null;

  const currentTransition = useMemo(() => {
    if (stateTransitions.length === 0) {
      return null;
    }

    return (
      stateTransitions[
        stateTransitions.length - 1
      ] ?? null
    );
  }, [stateTransitions]);

  const currentTransitionCorrelation =
    useMemo(() => {
      if (!currentTransition) {
        return null;
      }

      return (
        correlations.find(
          (correlation) =>
            correlation.from_state ===
              currentTransition.from_state &&
            correlation.to_state === currentTransition.to
        ) ?? null
      );
    }, [correlations, currentTransition]);

  const caseStatus =
    investigation?.policy_decision
      ? "Analysis Complete"
      : investigation?.status ??
        "Under Investigation";

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

            {/* =====================================================
                PAGE HEADER
            ====================================================== */}

            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                Attack-state analysis
              </p>

              <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#17191d]">
                    Attack State
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                    Temporal view of the attack
                    progression determined by the
                    existing PayShield correlation
                    engine.
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

            {/* =====================================================
                ERROR
            ====================================================== */}

            {error && (
              <div className="mb-6 border border-[#e5b4b0] bg-[#fff8f7] px-5 py-4">
                <p className="text-sm font-medium text-[#b42318]">
                  {error}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Run the existing case analysis
                  first, then return to this page.
                </p>
              </div>
            )}

            {/* =====================================================
                LOADING
            ====================================================== */}

            {loading && (
              <div className="border border-[#dfe2e6] bg-white px-5 py-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Loading attack state
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Retrieving the existing
                  investigation, transition history
                  and policy result.
                </p>
              </div>
            )}

            {investigation && (
              <>
                {/* =================================================
                    CURRENT STATE
                ================================================== */}

                <section>
                  <SectionHeader
                    eyebrow="Current state"
                    title="Active attack state"
                    description="The current state comes directly from the existing investigation generated by the PayShield pipeline."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      label="Current state"
                      value={attackState}
                      accent
                    />

                    <MetricCard
                      label="Attack-stage progression"
                      value={
                        currentStageNumber !== null
                          ? `${currentStageNumber} / ${attackStages.length}`
                          : "—"
                      }
                    />

                    <MetricCard
                      label="Transitions"
                      value={String(
                        stateTransitions.length
                      )}
                    />

                    <MetricCard
                      label="Policy decision"
                      value={finalDecision}
                    />
                  </div>
                </section>

                {/* =================================================
                    ATTACK PROGRESSION
                ================================================== */}

                <section className="mt-10">
                  <SectionHeader
                    eyebrow="Temporal progression"
                    title="Attack-state progression"
                    description="The complete canonical state vocabulary comes from the existing correlator. Reached and current states are derived from this investigation's actual transition history."
                  />

                  <div className="border border-[#dfe2e6] bg-white px-6 py-7">
                    {progression.length === 0 ? (
                      <EmptyState
                        title="Attack-state vocabulary unavailable"
                        description="The investigation does not currently expose the canonical attack-state vocabulary."
                      />
                    ) : (
                      <>
                        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-400">
                              Attack stages reached
                            </p>

                            <p className="mt-1 text-sm font-medium text-[#17191d]">
                              {reachedAttackStages} of{" "}
                              {attackStages.length}{" "}
                              attack stages reached
                            </p>
                          </div>

                          <div className="font-mono text-[10px] text-gray-400">
                            Starting state: NONE
                          </div>
                        </div>

                        {/* =================================================
                            CONTINUOUS STATE FLOW
                        ================================================== */}

                        <div className="overflow-x-auto pb-2">
                          <div className="flex min-w-max items-center justify-center">
                            {progression.map(
                              (node, index) => (
                                <div
                                  key={`${node.state}-${index}`}
                                  className="flex items-center"
                                >
                                  <AttackFlowNode
                                    node={node}
                                    stageNumber={
                                      node.isStart
                                        ? null
                                        : attackStages.findIndex(
                                            (
                                              stage
                                            ) =>
                                              stage.state ===
                                              node.state
                                          ) + 1
                                    }
                                  />

                                  {index <
                                    progression.length -
                                      1 && (
                                    <AttackFlowArrow
                                      active={
                                        progression[
                                          index + 1
                                        ].reached
                                      }
                                    />
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        <div className="mt-7 flex flex-wrap gap-5 border-t border-[#e5e7eb] pt-5">
                          <LegendItem
                            symbol="✓"
                            label="Reached"
                          />

                          <LegendItem
                            symbol="●"
                            label="Current"
                          />

                          <LegendItem
                            symbol="○"
                            label="Not reached"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* =================================================
                    CURRENT TRANSITION
                ================================================== */}

                <section className="mt-10">
                  <SectionHeader
                    eyebrow="Latest escalation"
                    title="Current transition"
                    description="The most recent state transition recorded by the existing correlator."
                  />

                  <div className="border border-[#17191d] bg-[#17191d] px-6 py-7 text-white">
                    {currentTransition ? (
                      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                            Latest recorded transition
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <StatePill
                              label={
                                currentTransition.from_state ??
                                "UNKNOWN"
                              }
                              dark
                            />

                            <span className="font-mono text-sm text-gray-500">
                              →
                            </span>

                            <StatePill
                              label={
                                currentTransition.to ??
                                "UNKNOWN"
                              }
                              active
                            />
                          </div>

                          <p className="mt-5 max-w-3xl text-sm leading-6 text-gray-300">
                            {currentTransition.reason ??
                              currentTransitionCorrelation?.reason ??
                              "No transition reason was recorded."}
                          </p>
                        </div>

                        <div className="min-w-[210px] border border-white/20 px-5 py-4">
                          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-400">
                            Evidence timestamp
                          </p>

                          <p className="mt-2 font-mono text-lg font-semibold">
                            {formatTimestamp(
                              currentTransition.t
                            )}
                          </p>

                          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-gray-500">
                            Stream
                          </p>

                          <p className="mt-1 text-sm font-medium text-gray-200">
                            {currentTransition.stream ??
                              "Unknown"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                          No transition
                        </p>

                        <p className="mt-3 text-sm text-gray-300">
                          No attack-state transition
                          has been recorded for this
                          investigation.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* =================================================
                    TRANSITION HISTORY
                ================================================== */}

                <section className="mt-10">
                  <SectionHeader
                    eyebrow="Temporal case model"
                    title="Transition history"
                    description="The chronological record of attack-state transitions already stored in the investigation."
                  />

                  <div className="border border-[#dfe2e6] bg-white">
                    {stateTransitions.length === 0 ? (
                      <EmptyState
                        title="No transitions recorded"
                        description="The investigation timeline does not contain attack-state transition events."
                      />
                    ) : (
                      <div className="divide-y divide-[#e5e7eb]">
                        {stateTransitions.map(
                          (transition, index) => (
                            <TransitionRow
                              key={`${transition.t}-${index}`}
                              transition={transition}
                              index={index}
                            />
                          )
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* =================================================
                    RELATED EVIDENCE
                ================================================== */}

                <section className="mt-10">
                  <SectionHeader
                    eyebrow="Evidence context"
                    title="Related evidence streams"
                    description="Evidence streams already attached to the investigation and used to explain the observed attack progression."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {evidence.length === 0 ? (
                      <div className="md:col-span-2 xl:col-span-4">
                        <EmptyState
                          title="No evidence recorded"
                          description="The investigation does not currently expose evidence stream records."
                        />
                      </div>
                    ) : (
                      evidence.map(
                        (item, index) => (
                          <EvidenceContextCard
                            key={`${item.stream}-${index}`}
                            evidence={item}
                          />
                        )
                      )
                    )}
                  </div>
                </section>

                {/* =================================================
                    EVIDENCE → ESCALATION
                ================================================== */}

                <section className="mt-10">
                  <SectionHeader
                    eyebrow="Escalation context"
                    title="Evidence → attack-state escalation"
                    description="A transition-focused view showing which evidence stream accompanied each escalation and what evidence was recorded at that point."
                  />

                  <div className="border border-[#dfe2e6] bg-white">
                    {stateTransitions.length === 0 ? (
                      <EmptyState
                        title="No escalation history"
                        description="There is no recorded state progression to explain yet."
                      />
                    ) : (
                      <div className="divide-y divide-[#e5e7eb]">
                        {stateTransitions.map(
                          (transition, index) => (
                            <EvidenceEscalationRow
                              key={`${transition.t}-evidence-${index}`}
                              transition={transition}
                              index={index}
                            />
                          )
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* =================================================
                    POLICY CONNECTION
                ================================================== */}

                <section className="mt-10 mb-10">
                  <SectionHeader
                    eyebrow="Policy connection"
                    title="Attack state → policy decision"
                    description="The policy result shown here is the existing decision attached to this investigation. This page does not calculate, override or recommend a policy action."
                  />

                  <div className="border border-[#17191d] bg-[#17191d] px-6 py-7 text-white">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                          Correlated state
                        </p>

                        <p className="mt-3 text-2xl font-semibold tracking-tight">
                          {attackState}
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-400">
                          Determined by the existing
                          correlator.
                        </p>
                      </div>

                      <div className="hidden font-mono text-xl text-gray-500 lg:block">
                        →
                      </div>

                      <div className="border border-white/20 px-5 py-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                          Existing policy decision
                        </p>

                        <p className="mt-3 break-words text-2xl font-semibold">
                          {finalDecision}
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-400">
                          Supplied by the existing
                          investigation and orchestrator
                          flow.
                        </p>
                      </div>
                    </div>
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

      <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
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
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-[#dfe2e6] bg-white px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p
        className={`mt-3 break-words text-lg font-semibold ${
          accent
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
   CONTINUOUS ATTACK FLOW NODE
========================================================= */

function AttackFlowNode({
  node,
  stageNumber,
}: {
  node: StateNode;
  stageNumber: number | null;
}) {
  if (node.isStart) {
    return (
      <div className="flex h-[104px] w-[150px] flex-col justify-between border border-[#cbd5e1] bg-[#f8fafc] px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-gray-400">
            Start
          </span>

          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-gray-400">
            Initial
          </span>
        </div>

        <div>
          <p className="font-mono text-xs font-semibold text-[#17191d]">
            NONE
          </p>

          <p className="mt-1 text-[9px] text-gray-400">
            Starting state
          </p>
        </div>
      </div>
    );
  }

  const stateClass = node.current
    ? "border-[#17191d] bg-[#17191d] text-white"
    : node.reached
      ? "border-[#cbd5cf] bg-[#f7faf8] text-[#17191d]"
      : "border-[#dfe2e6] bg-[#fafafa] text-gray-400";

  const statusLabel = node.current
    ? "Current"
    : node.reached
      ? "Reached"
      : "Not reached";

  const statusClass = node.current
    ? "text-white"
    : node.reached
      ? "text-[#027a48]"
      : "text-gray-400";

  const marker = node.current
    ? "●"
    : node.reached
      ? "✓"
      : "○";

  return (
    <div
      className={`flex h-[104px] w-[190px] flex-col justify-between border px-4 py-4 ${stateClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[8px] text-gray-400">
          {stageNumber !== null
            ? String(stageNumber).padStart(2, "0")
            : ""}
        </span>

        <span
          className={`font-mono text-[8px] uppercase tracking-[0.1em] ${statusClass}`}
        >
          {marker} {statusLabel}
        </span>
      </div>

      <p
        className={`break-words font-mono text-[11px] font-semibold leading-4 ${
          node.current
            ? "text-white"
            : ""
        }`}
      >
        {node.state}
      </p>
    </div>
  );
}

/* =========================================================
   FLOW ARROW
========================================================= */

function AttackFlowArrow({
  active,
}: {
  active: boolean;
}) {
  return (
    <div className="flex h-[104px] w-[54px] shrink-0 items-center justify-center">
      <div className="flex w-full items-center">
        <div
          className={`h-px flex-1 ${
            active
              ? "bg-[#17191d]"
              : "bg-[#dfe2e6]"
          }`}
        />

        <span
          className={`-ml-0.5 font-mono text-xs ${
            active
              ? "text-[#17191d]"
              : "text-gray-400"
          }`}
        >
          →
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function LegendItem({
  symbol,
  label,
}: {
  symbol: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] font-medium text-[#17191d]">
        {symbol}
      </span>

      <span className="text-xs text-gray-500">
        {label}
      </span>
    </div>
  );
}

/* =========================================================
   STATE PILL
========================================================= */

function StatePill({
  label,
  active = false,
  dark = false,
}: {
  label: string;
  active?: boolean;
  dark?: boolean;
}) {
  return (
    <span
      className={`border px-3 py-2 font-mono text-[10px] font-semibold ${
        active
          ? "border-white bg-white text-[#17191d]"
          : dark
            ? "border-white/20 bg-white/5 text-gray-300"
            : "border-[#dfe2e6] bg-[#f8f9fa] text-[#17191d]"
      }`}
    >
      {label}
    </span>
  );
}

/* =========================================================
   TRANSITION HISTORY ROW
========================================================= */

function TransitionRow({
  transition,
  index,
}: {
  transition: TimelineEvent;
  index: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 px-5 py-6 lg:grid-cols-[120px_1fr_190px] lg:items-start">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
          Transition
        </p>

        <p className="mt-2 font-mono text-xs font-semibold text-[#17191d]">
          {String(index + 1).padStart(2, "0")}
        </p>

        <p className="mt-1 font-mono text-[10px] text-gray-500">
          {formatTimestamp(transition.t)}
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatePill
            label={
              transition.from_state ??
              "UNKNOWN"
            }
          />

          <span className="font-mono text-xs text-gray-400">
            →
          </span>

          <StatePill
            label={transition.to ?? "UNKNOWN"}
            active
          />
        </div>

        <p className="mt-4 text-sm leading-6 text-gray-600">
          {transition.reason ??
            "No transition reason was recorded."}
        </p>
      </div>

      <div className="border-l border-[#e5e7eb] pl-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
          Evidence stream
        </p>

        <p className="mt-2 break-words font-mono text-xs font-medium text-[#17191d]">
          {transition.stream ?? "Unknown"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   EVIDENCE CONTEXT CARD
========================================================= */

function EvidenceContextCard({
  evidence,
}: {
  evidence: Evidence;
}) {
  const primaryValue =
    evidence.probability ??
    evidence.anomaly_score;

  return (
    <div className="border border-[#dfe2e6] bg-white px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
            Evidence stream
          </p>

          <h3 className="mt-2 break-words text-sm font-semibold uppercase tracking-wide text-[#17191d]">
            {evidence.stream}
          </h3>
        </div>

        {typeof primaryValue === "number" && (
          <span className="shrink-0 font-mono text-xs font-semibold text-[#17191d]">
            {primaryValue.toFixed(2)}
          </span>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {evidence.matched_pattern && (
          <EvidenceDetail
            label="Matched pattern"
            value={evidence.matched_pattern}
          />
        )}

        {evidence.triggering_feature && (
          <EvidenceDetail
            label="Triggering feature"
            value={evidence.triggering_feature}
          />
        )}

        {typeof evidence.amount === "number" && (
          <EvidenceDetail
            label="Amount"
            value={String(evidence.amount)}
          />
        )}

        {evidence.to_account && (
          <EvidenceDetail
            label="Recipient"
            value={evidence.to_account}
          />
        )}

        {evidence.identifier_flagged_by_graph !==
          undefined && (
          <EvidenceDetail
            label="Graph identifier flag"
            value={
              evidence.identifier_flagged_by_graph
                ? "Confirmed"
                : "Not flagged"
            }
          />
        )}

        {evidence.device_linked_to_flagged_accounts &&
          evidence.device_linked_to_flagged_accounts
            .length > 0 && (
            <EvidenceDetail
              label="Linked flagged accounts"
              value={evidence.device_linked_to_flagged_accounts.join(
                ", "
              )}
            />
          )}

        {evidence.is_confirmed_mule !==
          undefined && (
          <EvidenceDetail
            label="Confirmed mule"
            value={
              evidence.is_confirmed_mule
                ? "Yes"
                : "No"
            }
          />
        )}

        {typeof evidence.community_id === "number" && (
          <EvidenceDetail
            label="Community"
            value={`#${evidence.community_id}`}
          />
        )}

        {typeof evidence.pagerank === "number" && (
          <EvidenceDetail
            label="PageRank"
            value={evidence.pagerank.toFixed(4)}
          />
        )}

        {typeof evidence.betweenness ===
          "number" && (
          <EvidenceDetail
            label="Betweenness"
            value={evidence.betweenness.toFixed(4)}
          />
        )}

        {evidence.is_structural_hub !== undefined && (
          <EvidenceDetail
            label="Structural hub"
            value={
              evidence.is_structural_hub
                ? "Yes"
                : "No"
            }
          />
        )}

        {evidence.confirmed_mules_in_community &&
          evidence.confirmed_mules_in_community
            .length > 0 && (
            <EvidenceDetail
              label="Confirmed mules in community"
              value={evidence.confirmed_mules_in_community.join(
                ", "
              )}
            />
          )}

        {!evidence.matched_pattern &&
          !evidence.triggering_feature &&
          typeof evidence.amount !== "number" &&
          !evidence.to_account &&
          evidence.identifier_flagged_by_graph ===
            undefined &&
          (!evidence.device_linked_to_flagged_accounts ||
            evidence.device_linked_to_flagged_accounts
              .length === 0) &&
          evidence.is_confirmed_mule === undefined &&
          evidence.community_id === undefined &&
          evidence.pagerank === undefined &&
          evidence.betweenness === undefined &&
          evidence.is_structural_hub === undefined &&
          (!evidence.confirmed_mules_in_community ||
            evidence.confirmed_mules_in_community
              .length === 0) && (
            <p className="text-xs leading-5 text-gray-400">
              The investigation contains this
              evidence stream, but no additional
              stream-specific fields were returned.
            </p>
          )}
      </div>
    </div>
  );
}

/* =========================================================
   EVIDENCE DETAIL
========================================================= */

function EvidenceDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs leading-5 text-gray-600">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   EVIDENCE → ESCALATION ROW
========================================================= */

function EvidenceEscalationRow({
  transition,
  index,
}: {
  transition: TimelineEvent;
  index: number;
}) {
  return (
    <div className="px-5 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[55px_250px_140px_1fr] lg:items-start">
        <div className="flex h-8 w-8 items-center justify-center border border-[#dfe2e6] bg-[#fafafa] font-mono text-[10px] font-semibold text-[#17191d]">
          {String(index + 1).padStart(2, "0")}
        </div>

        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
            State transition
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="break-words font-mono text-xs font-semibold text-[#17191d]">
              {transition.from_state ??
                "UNKNOWN"}
            </span>

            <span className="font-mono text-xs text-gray-400">
              →
            </span>

            <span className="break-words font-mono text-xs font-semibold text-[#027a48]">
              {transition.to ?? "UNKNOWN"}
            </span>
          </div>
        </div>

        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
            Evidence
          </p>

          <p className="mt-2 break-words font-mono text-[10px] font-semibold uppercase text-[#17191d]">
            {transition.stream ??
              "Unknown"}
          </p>

          <p className="mt-1 font-mono text-[10px] text-gray-400">
            {formatTimestamp(transition.t)}
          </p>
        </div>

        <div className="border-l border-[#e5e7eb] pl-5">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
            Recorded evidence / reason
          </p>

          <p className="mt-2 text-xs leading-6 text-gray-600">
            {transition.reason ??
              "No transition reason was recorded."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-8">
      <p className="text-sm font-medium text-[#17191d]">
        {title}
      </p>

      <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatTimestamp(timestamp: string) {
  if (!timestamp) {
    return "Timestamp unavailable";
  }

  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}