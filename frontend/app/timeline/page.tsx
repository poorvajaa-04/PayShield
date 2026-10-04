"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CircleDot,
  Clock3,
  CreditCard,
  GitBranch,
  MessageSquare,
  Network,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

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

  action?: string;
  attack_state?: string;
  evidence_count?: number;

  [key: string]: unknown;
}

interface Investigation {
  case_id: string;
  status: string;
  evidence: Array<Record<string, unknown>>;
  entities: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  timeline: TimelineEvent[];
  correlations: Array<Record<string, unknown>>;
  attack_states?: string[];
  attack_state: string | null;
  risk_index: number | null;
  policy_decision: string | null;
  findings: string[];
}

interface TimelineGroup {
  timestamp: string;
  events: TimelineEvent[];
}

export default function TimelinePage() {
  const [investigation, setInvestigation] =
    useState<Investigation | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvestigation = async () => {
      try {
        setLoading(true);
        setError("");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error(
            "NEXT_PUBLIC_API_URL is not configured."
          );
        }

        const response = await fetch(
          `${apiUrl.replace(
            /\/$/,
            ""
          )}/investigations/PS-REAL-001`,
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

        setInvestigation(null);
      } finally {
        setLoading(false);
      }
    };

    loadInvestigation();
  }, []);

  const chronologicalTimeline = useMemo(() => {
    if (!investigation) {
      return [];
    }

    return investigation.timeline
      .map((event, index) => ({
        event,
        originalIndex: index,
      }))
      .sort((a, b) => {
        const aTime = parseTimestamp(a.event.t);
        const bTime = parseTimestamp(b.event.t);

        if (aTime !== null && bTime !== null) {
          if (aTime !== bTime) {
            return aTime - bTime;
          }
        }

        return a.originalIndex - b.originalIndex;
      })
      .map((item) => item.event);
  }, [investigation]);

  const timelineGroups = useMemo(() => {
    const groups: TimelineGroup[] = [];

    chronologicalTimeline.forEach((event) => {
      const lastGroup = groups[groups.length - 1];

      if (
        lastGroup &&
        areSameTimestamp(
          lastGroup.timestamp,
          event.t
        )
      ) {
        lastGroup.events.push(event);
      } else {
        groups.push({
          timestamp: event.t,
          events: [event],
        });
      }
    });

    return groups;
  }, [chronologicalTimeline]);

  const attackState =
    investigation?.attack_state ?? "NONE";

  const finalDecision =
    investigation?.policy_decision ?? "PENDING";

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
            ===================================================== */}

            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                Temporal investigation
              </p>

              <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#17191d]">
                    Timeline
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                    Chronological reconstruction of the
                    evidence, attack-state progression,
                    and resulting policy decision
                    recorded for this investigation.
                  </p>
                </div>

                {investigation && (
                  <div className="flex flex-wrap gap-3">
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
            ===================================================== */}

            {error && (
              <div className="mb-6 border border-[#e5b4b0] bg-[#fff8f7] px-5 py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0 text-[#b42318]"
                  />

                  <div>
                    <p className="text-sm font-medium text-[#b42318]">
                      {error}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      The investigation could not be
                      retrieved from the existing
                      PayShield API.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================
                LOADING
            ===================================================== */}

            {loading && (
              <div className="border border-[#dfe2e6] bg-white px-5 py-8">
                <div className="flex items-start gap-3">
                  <Clock3
                    size={17}
                    className="mt-0.5 text-gray-400"
                  />

                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                      Loading timeline
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      Retrieving the temporal
                      investigation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {investigation && !loading && (
              <>
                {/* =================================================
                    CASE INTELLIGENCE
                ================================================= */}

                <section className="mb-10">
                  <SectionHeader
                    eyebrow="Case intelligence"
                    title="Investigation summary"
                    description="Current case context surrounding the chronological event history."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <MetricCard
                      label="Case"
                      value={investigation.case_id}
                      mono
                    />

                    <MetricCard
                      label="Current attack state"
                      value={attackState}
                      mono
                    />

                    <MetricCard
                      label="Policy decision"
                      value={finalDecision}
                      mono
                      accent
                    />
                  </div>
                </section>

                {/* =================================================
                    TIMELINE
                ================================================= */}

                <section>
                  <SectionHeader
                    eyebrow="Temporal case model"
                    title="Investigation timeline"
                    description="A chronological view of evidence observations, attack-state transitions, and policy actions already recorded by the PayShield case pipeline."
                  />

                  <div className="border border-[#dfe2e6] bg-white">
                    {timelineGroups.length === 0 ? (
                      <EmptyState />
                    ) : (
                      <div className="px-5 py-10 sm:px-8 lg:px-10">
                        <div className="space-y-12">
                          {timelineGroups.map(
                            (group, groupIndex) => (
                              <TimelineGroupBlock
                                key={`${group.timestamp}-${groupIndex}`}
                                group={group}
                              />
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* =================================================
                    LEGEND
                ================================================= */}

                {timelineGroups.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border border-[#dfe2e6] bg-white px-5 py-4">
                    <LegendItem
                      icon={<GitBranch size={14} />}
                      label="Attack-state transition"
                    />

                    <LegendItem
                      icon={<ShieldCheck size={14} />}
                      label="Policy decision"
                    />

                    <LegendItem
                      icon={<CircleDot size={14} />}
                      label="Evidence / other event"
                    />
                  </div>
                )}

                {/* =================================================
                    FINAL POLICY OUTCOME
                ================================================= */}

                <section className="mb-10 mt-10">
                  <SectionHeader
                    eyebrow="Investigation outcome"
                    title="Resulting policy decision"
                    description="The final policy result already attached to this investigation. The Timeline page does not calculate or modify the decision."
                  />

                  <div className="border border-[#17191d] bg-[#17191d] px-6 py-7 text-white">
                    <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_auto_1fr] lg:items-center">

                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                          Attack state
                        </p>

                        <p className="mt-3 break-words text-2xl font-semibold tracking-tight">
                          {attackState}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          Supplied by the existing PayShield
                          investigation and correlator.
                        </p>
                      </div>

                      <ArrowRight
                        size={20}
                        className="hidden text-gray-500 lg:block"
                      />

                      <div className="border border-white/20 px-5 py-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                          Existing policy decision
                        </p>

                        <p className="mt-3 break-words text-2xl font-semibold">
                          {finalDecision}
                        </p>

                        {getLatestDecisionEvent(
                          chronologicalTimeline
                        ) && (
                          <div className="mt-4 border-t border-white/10 pt-4">
                            <div className="flex flex-wrap gap-x-6 gap-y-3">

                              <div>
                                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-500">
                                  Decision event
                                </p>

                                <p className="mt-1 font-mono text-[10px] text-gray-300">
                                  {formatTimestamp(
                                    getLatestDecisionEvent(
                                      chronologicalTimeline
                                    )!.t
                                  )}
                                </p>
                              </div>

                              {typeof getLatestDecisionEvent(
                                chronologicalTimeline
                              )!.evidence_count ===
                                "number" && (
                                <div>
                                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-500">
                                    Evidence considered
                                  </p>

                                  <p className="mt-1 font-mono text-[10px] text-gray-300">
                                    {
                                      getLatestDecisionEvent(
                                        chronologicalTimeline
                                      )!.evidence_count
                                    }
                                  </p>
                                </div>
                              )}

                            </div>
                          </div>
                        )}
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

/* =============================================================
   TIMELINE GROUP

   No marker.
   No numbered circle.
   No vertical connecting line.

   The timestamp itself is the chronological anchor.
============================================================= */

function TimelineGroupBlock({
  group,
}: {
  group: TimelineGroup;
}) {
  return (
    <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-0 sm:grid-cols-[115px_minmax(0,1fr)]">

      {/* TIMESTAMP */}

      <div className="pr-5 pt-1 text-right sm:pr-8">
        <p className="font-mono text-sm font-semibold text-[#17191d]">
          {formatTimestamp(group.timestamp)}
        </p>
      </div>

      {/* EVENTS */}

      <div className="min-w-0">
        <div className="space-y-5">
          {group.events.map((event, index) => (
            <TimelineEventCard
              key={`${event.t}-${event.event}-${index}`}
              event={event}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   EVENT CARD
============================================================= */

function TimelineEventCard({
  event,
}: {
  event: TimelineEvent;
}) {
  const type = getEventType(event);

  const isTransition =
    event.event ===
    "attack_state_transition";

  const isDecision =
    event.event ===
    "orchestrator_decision";

  const fromState =
    event.from_state ?? "UNKNOWN";

  const toState =
    event.to ?? event.to_state ?? "UNKNOWN";

  return (
    <div
      className={`min-w-0 border bg-white ${type.cardClass}`}
    >
      <div className="px-4 py-4 sm:px-5">

        {/* =====================================================
            EVENT HEADER

            IMPORTANT:
            Event category and stream are deliberately placed
            on separate lines. This prevents values such as

              Evidencelure
              State transitionnetwork

            from visually merging.
        ===================================================== */}

        <div className="flex min-w-0 items-start gap-3">

          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center ${type.iconClass}`}
          >
            {type.icon}
          </div>

          <div className="min-w-0 flex-1">

            {/* EVENT CATEGORY */}

            <div>
              <p
                className={`font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${type.labelClass}`}
              >
                {type.label}
              </p>

              {/* STREAM ON ITS OWN LINE */}

              {event.stream && (
                <div className="mt-2">
                  <span className="inline-block border border-[#d9dde2] bg-[#f7f8f9] px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-gray-500">
                    {event.stream}
                  </span>
                </div>
              )}
            </div>

            {/* EVENT TITLE */}

            <div className="mt-4 min-w-0">

              <h3 className="break-words text-sm font-semibold leading-5 text-[#17191d]">
                {formatEventName(event.event)}
              </h3>

              <p className="mt-1 break-all font-mono text-[9px] leading-4 text-gray-400">
                {event.event}
              </p>

            </div>
          </div>
        </div>

        {/* =====================================================
            ATTACK STATE TRANSITION
        ===================================================== */}

        {isTransition && (
          <div className="mt-5 border border-[#dfe2e6] bg-[#f8f9fa] px-4 py-4">

            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              Attack-state transition
            </p>

            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">

              <StateBox label={fromState} />

              <ArrowRight
                size={16}
                strokeWidth={2}
                className="shrink-0 text-gray-400"
              />

              <StateBox
                label={toState}
                active
              />

            </div>
          </div>
        )}

        {/* =====================================================
            POLICY DECISION
        ===================================================== */}

        {isDecision && (
          <div className="mt-5 border border-[#17191d] bg-[#17191d] px-4 py-4 text-white">

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
                  Policy action
                </p>

                <p className="mt-2 break-words text-lg font-semibold">
                  {event.action ?? "Not specified"}
                </p>
              </div>

              {event.attack_state && (
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-500">
                    Attack state
                  </p>

                  <p className="mt-2 break-words font-mono text-xs text-gray-300">
                    {event.attack_state}
                  </p>
                </div>
              )}

              {typeof event.evidence_count ===
                "number" && (
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-500">
                    Evidence considered
                  </p>

                  <p className="mt-2 font-mono text-xs text-gray-300">
                    {event.evidence_count}
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* =====================================================
            EVENT DETAILS
        ===================================================== */}

        <div className="mt-5">
          <EventDetails event={event} />
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   STATE BOX
============================================================= */

function StateBox({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`max-w-full border px-3 py-2.5 ${
        active
          ? "border-[#17191d] bg-[#17191d] text-white"
          : "border-[#d8dce1] bg-white text-[#17191d]"
      }`}
    >
      <p
        className={`break-all font-mono text-[10px] font-semibold leading-4 ${
          active
            ? "text-white"
            : "text-[#17191d]"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

/* =============================================================
   EVENT DETAILS
============================================================= */

function EventDetails({
  event,
}: {
  event: TimelineEvent;
}) {
  const details: Array<{
    label: string;
    value: string;
  }> = [];

  if (event.reason) {
    details.push({
      label: "Reason",
      value: event.reason,
    });
  }

  if (typeof event.probability === "number") {
    details.push({
      label: "Probability",
      value: event.probability.toFixed(2),
    });
  }

  if (typeof event.anomaly_score === "number") {
    details.push({
      label: "Anomaly score",
      value: event.anomaly_score.toFixed(2),
    });
  }

  if (event.matched_pattern) {
    details.push({
      label: "Matched pattern",
      value: event.matched_pattern,
    });
  }

  if (event.triggering_feature) {
    details.push({
      label: "Triggering feature",
      value: event.triggering_feature,
    });
  }

  if (typeof event.amount === "number") {
    details.push({
      label: "Amount",
      value: String(event.amount),
    });
  }

  if (event.to_account) {
    details.push({
      label: "Recipient",
      value: event.to_account,
    });
  }

  if (
    event.identifier_flagged_by_graph !==
    undefined
  ) {
    details.push({
      label: "Identifier flagged by graph",
      value:
        event.identifier_flagged_by_graph
          ? "Yes"
          : "No",
    });
  }

  if (
    event.device_linked_to_flagged_accounts &&
    event.device_linked_to_flagged_accounts
      .length > 0
  ) {
    details.push({
      label: "Linked flagged accounts",
      value:
        event.device_linked_to_flagged_accounts.join(
          ", "
        ),
    });
  }

  if (event.community_id !== undefined) {
    details.push({
      label: "Community",
      value:
        event.community_id === null
          ? "Not available"
          : String(event.community_id),
    });
  }

  if (event.is_confirmed_mule !== undefined) {
    details.push({
      label: "Confirmed mule",
      value: event.is_confirmed_mule
        ? "Yes"
        : "No",
    });
  }

  if (event.is_structural_hub !== undefined) {
    details.push({
      label: "Structural hub",
      value: event.is_structural_hub
        ? "Yes"
        : "No",
    });
  }

  if (typeof event.pagerank === "number") {
    details.push({
      label: "PageRank",
      value: event.pagerank.toFixed(4),
    });
  }

  if (typeof event.betweenness === "number") {
    details.push({
      label: "Betweenness",
      value: event.betweenness.toFixed(4),
    });
  }

  if (details.length === 0) {
    if (
      event.event ===
        "attack_state_transition" ||
      event.event ===
        "orchestrator_decision"
    ) {
      return null;
    }

    return (
      <p className="text-xs leading-5 text-gray-400">
        No additional event-specific details were
        recorded.
      </p>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
      {details.map((detail, index) => (
        <div
          key={`${detail.label}-${index}`}
          className={
            detail.label === "Reason"
              ? "min-w-0 md:col-span-2"
              : "min-w-0"
          }
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
            {detail.label}
          </p>

          <p className="mt-1 break-words text-xs leading-5 text-gray-600">
            {detail.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* =============================================================
   EVENT TYPE
============================================================= */

function getEventType(event: TimelineEvent) {
  if (
    event.event ===
    "attack_state_transition"
  ) {
    return {
      label: "State transition",
      icon: <GitBranch size={15} />,
      iconClass:
        "bg-[#17191d] text-white",
      cardClass:
        "border-[#17191d]",
      labelClass:
        "text-[#17191d]",
    };
  }

  if (
    event.event ===
    "orchestrator_decision"
  ) {
    return {
      label: "Policy decision",
      icon: <ShieldCheck size={15} />,
      iconClass:
        "bg-[#17191d] text-white",
      cardClass:
        "border-[#17191d]",
      labelClass:
        "text-[#17191d]",
    };
  }

  if (
    event.stream === "lure" ||
    event.event ===
      "suspicious_message_detected"
  ) {
    return {
      label: "Evidence",
      icon: <MessageSquare size={15} />,
      iconClass:
        "border border-[#dfe2e6] bg-[#f8f9fa] text-[#17191d]",
      cardClass:
        "border-[#dfe2e6]",
      labelClass:
        "text-gray-500",
    };
  }

  if (
    event.stream === "network" ||
    event.event ===
      "network_anomaly_detected"
  ) {
    return {
      label: "Evidence",
      icon: <Network size={15} />,
      iconClass:
        "border border-[#dfe2e6] bg-[#f8f9fa] text-[#17191d]",
      cardClass:
        "border-[#dfe2e6]",
      labelClass:
        "text-gray-500",
    };
  }

  if (
    event.stream === "session" ||
    event.event ===
      "session_anomaly_detected"
  ) {
    return {
      label: "Evidence",
      icon: <Smartphone size={15} />,
      iconClass:
        "border border-[#dfe2e6] bg-[#f8f9fa] text-[#17191d]",
      cardClass:
        "border-[#dfe2e6]",
      labelClass:
        "text-gray-500",
    };
  }

  if (
    event.stream === "entity_graph" ||
    event.event ===
      "transaction_initiated" ||
    event.event ===
      "large_transaction_initiated"
  ) {
    return {
      label: "Evidence",
      icon: <CreditCard size={15} />,
      iconClass:
        "border border-[#dfe2e6] bg-[#f8f9fa] text-[#17191d]",
      cardClass:
        "border-[#dfe2e6]",
      labelClass:
        "text-gray-500",
    };
  }

  return {
    label: "Event",
    icon: <CircleDot size={15} />,
    iconClass:
      "border border-[#dfe2e6] bg-[#f8f9fa] text-gray-500",
    cardClass:
      "border-[#dfe2e6]",
    labelClass:
      "text-gray-500",
  };
}

/* =============================================================
   EVENT NAME
============================================================= */

function formatEventName(eventName: string) {
  if (!eventName) {
    return "Unknown event";
  }

  return eventName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

/* =============================================================
   TIMESTAMP
============================================================= */

function parseTimestamp(
  timestamp: string
): number | null {
  if (!timestamp) {
    return null;
  }

  const numericTimestamp = Number(timestamp);

  if (
    Number.isFinite(numericTimestamp) &&
    timestamp.trim() !== ""
  ) {
    return numericTimestamp;
  }

  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime();
}

function formatTimestamp(timestamp: string) {
  if (!timestamp) {
    return "Timestamp unavailable";
  }

  const numericTimestamp = Number(timestamp);

  if (
    Number.isFinite(numericTimestamp) &&
    timestamp.trim() !== ""
  ) {
    return timestamp;
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

function areSameTimestamp(
  first: string,
  second: string
) {
  const firstParsed = parseTimestamp(first);
  const secondParsed = parseTimestamp(second);

  if (
    firstParsed !== null &&
    secondParsed !== null
  ) {
    return firstParsed === secondParsed;
  }

  return first === second;
}

/* =============================================================
   LATEST DECISION
============================================================= */

function getLatestDecisionEvent(
  events: TimelineEvent[]
) {
  for (
    let index = events.length - 1;
    index >= 0;
    index--
  ) {
    if (
      events[index].event ===
      "orchestrator_decision"
    ) {
      return events[index];
    }
  }

  return null;
}

/* =============================================================
   SECTION HEADER
============================================================= */

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

/* =============================================================
   METRIC CARD
============================================================= */

function MetricCard({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="border border-[#dfe2e6] bg-white px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p
        className={`mt-3 break-words text-lg font-semibold ${
          mono ? "font-mono" : ""
        } ${
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

/* =============================================================
   LEGEND
============================================================= */

function LegendItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-gray-500">
        {icon}
      </span>

      <span className="text-xs text-gray-500">
        {label}
      </span>
    </div>
  );
}

/* =============================================================
   EMPTY STATE
============================================================= */

function EmptyState() {
  return (
    <div className="flex items-start gap-3 px-5 py-10">
      <Clock3
        size={17}
        className="mt-0.5 shrink-0 text-gray-400"
      />

      <div>
        <p className="text-sm font-medium text-[#17191d]">
          No timeline events recorded
        </p>

        <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
          The investigation was retrieved successfully,
          but its temporal case model does not currently
          contain any events.
        </p>
      </div>
    </div>
  );
}