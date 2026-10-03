"use client";

import { useEffect, useMemo, useState } from "react";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

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

interface Evidence {
  stream: string;
  amount?: number;
  to_account?: string;
  is_confirmed_mule?: boolean;
  community_id?: number | null;
  confirmed_mules_in_community?: string[];
  is_structural_hub?: boolean;
  pagerank?: number;
  betweenness?: number;
}

interface Investigation {
  case_id: string;
  entities: Entity[];
  edges?: Edge[];
  evidence: Evidence[];
}

export default function EntityGraphPage() {
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
          `${apiUrl}/investigations/PS-REAL-001`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Investigation could not be loaded."
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
            : "Failed to load entity graph."
        );
      } finally {
        setLoading(false);
      }
    };

    loadInvestigation();
  }, []);

  const entities =
    investigation?.entities ?? [];

  const edges =
    investigation?.edges ?? [];

  const graphEvidence =
    investigation?.evidence?.find(
      (item) =>
        item.stream === "entity_graph"
    );

  const sharedIdentifiers =
    entities.filter(
      (entity) =>
        entity.kind === "phone" ||
        entity.kind === "device"
    );

  /*
   * =========================================================
   * GRAPH MODEL
   *
   * Backend relationship model:
   *
   * ACC-1001
   *    ├── phone_link   → 9876500000
   *    ├── device_link  → device-attack-01
   *    └── transaction  → ACC-9001
   *
   * The transaction remains an edge in the backend.
   * For visualization, it is displayed as a transaction
   * node containing the transaction amount.
   * =========================================================
   */

  const graphNodes = useMemo(() => {
    const accountNodes = entities.filter(
      (entity) => entity.kind === "account"
    );

    const phoneNodes = entities.filter(
      (entity) => entity.kind === "phone"
    );

    const deviceNodes = entities.filter(
      (entity) => entity.kind === "device"
    );

    const transactionEdge =
      edges.find(
        (edge) =>
          edge.kind === "transaction"
      );

    const recipientId =
      graphEvidence?.to_account ??
      transactionEdge?.target;

    const sourceId =
      transactionEdge?.source;

    const sourceAccount =
      accountNodes.find(
        (entity) =>
          entity.id === sourceId
      ) ??
      accountNodes.find(
        (entity) =>
          entity.id !== recipientId
      );

    const recipient =
      accountNodes.find(
        (entity) =>
          entity.id === recipientId
      );

    return {
      sourceAccount,
      recipient,
      phone: phoneNodes[0],
      device: deviceNodes[0],
      transactionEdge,
    };
  }, [
    entities,
    edges,
    graphEvidence,
  ]);

  const transactionAmount =
    graphNodes.transactionEdge?.tx_amount ??
    graphEvidence?.amount;

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

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="mb-8">

              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                Entity intelligence
              </p>

              <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

                <div>

                  <h1 className="text-3xl font-semibold tracking-tight text-[#17191d]">
                    Entity Graph
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    Explore the accounts, devices, phones and
                    transaction relationships connected to the case.
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


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

              <div className="mb-6 border border-[#e5b4b0] bg-[#fff8f7] px-5 py-4">

                <p className="text-sm font-medium text-[#b42318]">
                  {error}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Run the real case from the Overview page first.
                </p>

              </div>

            )}


            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (

              <div className="border border-[#dfe2e6] bg-white px-5 py-8">

                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Loading entity graph
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Retrieving entity relationships from PayShield.
                </p>

              </div>

            )}


            {investigation && (

              <>

                {/* =================================================
                    GRAPH SUMMARY
                ================================================= */}

                <section>

                  <SectionHeader
                    eyebrow="Graph overview"
                    title="Case entity structure"
                    description="Entities and relationships extracted from the investigation."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

                    <MetricCard
                      label="Entities"
                      value={entities.length.toString()}
                    />

                    <MetricCard
                      label="Relationships"
                      value={edges.length.toString()}
                    />

                    <MetricCard
                      label="Shared identifiers"
                      value={sharedIdentifiers.length.toString()}
                    />

                    <MetricCard
                      label="Recipient"
                      value={
                        graphEvidence?.to_account ??
                        graphNodes.recipient?.id ??
                        "—"
                      }
                    />

                  </div>

                </section>


                {/* =================================================
                    ACTUAL GRAPH
                ================================================= */}

                <section className="mt-10">

                  <SectionHeader
                    eyebrow="Relationship graph"
                    title="Connected entities"
                    description="A node-and-edge representation of the identities and payment relationships discovered in this case."
                  />

                  <div className="border border-[#dfe2e6] bg-white">

                    {/* GRAPH HEADER */}

                    <div className="flex flex-col gap-3 border-b border-[#e5e7eb] px-5 py-4 md:flex-row md:items-center md:justify-between">

                      <div>

                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                          Graph model
                        </p>

                        <p className="mt-1 text-sm font-medium text-[#17191d]">
                          {entities.length} entities · {edges.length} relationships
                        </p>

                      </div>

                      <div className="flex flex-wrap gap-4">

                        <LegendDot
                          type="account"
                          label="Account"
                        />

                        <LegendDot
                          type="phone"
                          label="Phone"
                        />

                        <LegendDot
                          type="device"
                          label="Device"
                        />

                        <LegendDot
                          type="transaction"
                          label="Transaction"
                        />

                      </div>

                    </div>


                    {/* =================================================
                        GRAPH CANVAS
                    ================================================= */}

                    <div className="relative min-h-[680px] overflow-hidden bg-[#fafafa]">

                      {/* GRID */}

                      <div
                        className="pointer-events-none absolute inset-0 opacity-60"
                        style={{
                          backgroundImage:
                            "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
                          backgroundSize:
                            "32px 32px",
                        }}
                      />


                      {/* GRAPH CONTENT */}

                      <div className="relative mx-auto h-[680px] max-w-[1100px]">

                        {/* =================================================
                            SVG RELATIONSHIP LINES
                        ================================================= */}

                        <svg
                          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                          viewBox="0 0 1100 680"
                          preserveAspectRatio="none"
                        >

                          <defs>

                            <marker
                              id="arrow-normal"
                              markerWidth="8"
                              markerHeight="8"
                              refX="7"
                              refY="4"
                              orient="auto"
                              markerUnits="strokeWidth"
                            >

                              <path
                                d="M0,0 L8,4 L0,8 z"
                                fill="#9ca3af"
                              />

                            </marker>


                            <marker
                              id="arrow-transaction"
                              markerWidth="9"
                              markerHeight="9"
                              refX="8"
                              refY="4.5"
                              orient="auto"
                              markerUnits="strokeWidth"
                            >

                              <path
                                d="M0,0 L9,4.5 L0,9 z"
                                fill="#17191d"
                              />

                            </marker>

                          </defs>


                          {/* =================================================
                              PHONE → SOURCE ACCOUNT
                          ================================================= */}

                          {graphNodes.sourceAccount &&
                            graphNodes.phone && (

                              <GraphEdge
                                x1={170}
                                y1={105}
                                x2={550}
                                y2={275}
                                label="phone_link"
                              />

                            )}


                          {/* =================================================
                              DEVICE → SOURCE ACCOUNT
                          ================================================= */}

                          {graphNodes.sourceAccount &&
                            graphNodes.device && (

                              <GraphEdge
                                x1={930}
                                y1={105}
                                x2={550}
                                y2={275}
                                label="device_link"
                              />

                            )}


                          {/* =================================================
                              SOURCE ACCOUNT → TRANSACTION
                              
                              IMPORTANT:
                              No relationship label here.
                          ================================================= */}

                          {graphNodes.sourceAccount &&
                            graphNodes.transactionEdge && (

                              <GraphEdge
                                x1={550}
                                y1={355}
                                x2={550}
                                y2={425}
                                highlighted
                                showLabel={false}
                              />

                            )}


                          {/* =================================================
                              TRANSACTION → RECIPIENT
                              
                              IMPORTANT:
                              No relationship label here.
                          ================================================= */}

                          {graphNodes.recipient &&
                            graphNodes.transactionEdge && (

                              <GraphEdge
                                x1={550}
                                y1={515}
                                x2={550}
                                y2={585}
                                highlighted
                                showLabel={false}
                              />

                            )}

                        </svg>


                        {/* =================================================
                            PHONE NODE
                        ================================================= */}

                        {graphNodes.phone && (

                          <GraphNode
                            entity={
                              graphNodes.phone
                            }
                            className="absolute left-[15.5%] top-[15%] -translate-x-1/2 -translate-y-1/2"
                          />

                        )}


                        {/* =================================================
                            DEVICE NODE
                        ================================================= */}

                        {graphNodes.device && (

                          <GraphNode
                            entity={
                              graphNodes.device
                            }
                            className="absolute left-[84.5%] top-[15%] -translate-x-1/2 -translate-y-1/2"
                          />

                        )}


                        {/* =================================================
                            SOURCE ACCOUNT
                        ================================================= */}

                        {graphNodes.sourceAccount && (

                          <GraphNode
                            entity={
                              graphNodes.sourceAccount
                            }
                            className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2"
                          />

                        )}


                        {/* =================================================
                            TRANSACTION NODE
                        ================================================= */}

                        {graphNodes.transactionEdge && (

                          <TransactionNode
                            amount={
                              transactionAmount
                            }
                            className="absolute left-1/2 top-[66%] -translate-x-1/2 -translate-y-1/2"
                          />

                        )}


                        {/* =================================================
                            RECIPIENT ACCOUNT
                        ================================================= */}

                        {graphNodes.recipient && (

                          <GraphNode
                            entity={
                              graphNodes.recipient
                            }
                            highlighted
                            recipient
                            className="absolute left-1/2 top-[89%] -translate-x-1/2 -translate-y-1/2"
                          />

                        )}

                      </div>

                    </div>


                    {/* GRAPH FOOTER */}

                    <div className="border-t border-[#e5e7eb] px-5 py-4">

                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                        <p className="text-xs text-gray-500">
                          Lines represent relationships returned by the
                          PayShield entity graph.
                        </p>

                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
                          Graph evidence source
                        </p>

                      </div>

                    </div>

                  </div>

                </section>


                {/* =================================================
                    ENTITY INVENTORY
                ================================================= */}

                <section className="mt-10">

                  <SectionHeader
                    eyebrow="Entity inventory"
                    title="Entities"
                    description="Individual identities discovered in the investigation graph."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                    {entities.map((entity) => (

                      <div
                        key={entity.id}
                        className="border border-[#dfe2e6] bg-white px-5 py-5"
                      >

                        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
                          {entity.kind}
                        </p>

                        <p className="mt-3 break-all font-mono text-sm font-semibold text-[#17191d]">
                          {entity.id}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">

                          {entity.confirmed_mule && (
                            <Tag label="Confirmed mule" />
                          )}

                          {entity.dismissed && (
                            <Tag label="Dismissed" />
                          )}

                          {entity.risk_tier !== undefined && (
                            <Tag
                              label={`Risk tier ${entity.risk_tier}`}
                            />
                          )}

                        </div>

                      </div>

                    ))}

                  </div>

                </section>


                {/* =================================================
                    RELATIONSHIPS
                ================================================= */}

                <section className="mt-10">

                  <SectionHeader
                    eyebrow="Relationship layer"
                    title="Graph relationships"
                    description="Edges connecting accounts, devices, phones and transactions."
                  />

                  <div className="border border-[#dfe2e6] bg-white">

                    {edges.length === 0 ? (

                      <div className="px-5 py-8 text-sm text-gray-500">
                        No explicit graph relationships were returned
                        by the backend.
                      </div>

                    ) : (

                      <div className="divide-y divide-[#e5e7eb]">

                        {edges.map(
                          (edge, index) => (

                            <div
                              key={index}
                              className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-[1fr_160px_1fr]"
                            >

                              <EntityReference
                                label="Source"
                                value={edge.source}
                              />

                              <div className="flex items-center justify-center">

                                <span className="border border-[#dfe2e6] bg-[#f8f9fa] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-gray-500">
                                  {edge.kind}
                                </span>

                              </div>

                              <EntityReference
                                label="Target"
                                value={edge.target}
                              />

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                </section>


                {/* =================================================
                    GRAPH EVIDENCE
                ================================================= */}

                <section className="mt-10">

                  <SectionHeader
                    eyebrow="Graph-derived evidence"
                    title="Recipient analysis"
                    description="Structural properties of the receiving account used by PayShield during correlation."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                    <MetricCard
                      label="PageRank"
                      value={
                        typeof graphEvidence?.pagerank === "number"
                          ? graphEvidence.pagerank.toFixed(4)
                          : "—"
                      }
                    />

                    <MetricCard
                      label="Betweenness"
                      value={
                        typeof graphEvidence?.betweenness === "number"
                          ? graphEvidence.betweenness.toFixed(4)
                          : "—"
                      }
                    />

                    <MetricCard
                      label="Community"
                      value={
                        graphEvidence?.community_id !== undefined &&
                        graphEvidence.community_id !== null
                          ? `#${graphEvidence.community_id}`
                          : "—"
                      }
                    />

                    <MetricCard
                      label="Structural hub"
                      value={
                        graphEvidence?.is_structural_hub
                          ? "Yes"
                          : "No"
                      }
                    />

                  </div>

                </section>


                {/* =================================================
                    FOOTER
                ================================================= */}

                <section className="mt-10 mb-10 border border-[#17191d] bg-[#17191d] px-6 py-6 text-white">

                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                    PayShield entity engine
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    Entity relationships → Correlation → Attack state
                  </p>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                    The graph acts as an evidence source for
                    understanding relationships between payment
                    identities and infrastructure.
                  </p>

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
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#dfe2e6] bg-white px-5 py-5">

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p className="mt-3 break-all text-xl font-semibold text-[#17191d]">
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   GRAPH NODE
========================================================= */

function GraphNode({
  entity,
  highlighted = false,
  recipient = false,
  className = "",
}: {
  entity: Entity;
  highlighted?: boolean;
  recipient?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`z-10 w-[190px] border px-5 py-5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className} ${
        highlighted
          ? "border-[#17191d] bg-[#17191d] text-white"
          : "border-[#dfe2e6] bg-white text-[#17191d]"
      }`}
    >

      <div className="flex justify-center">

        <EntityIcon
          kind={entity.kind}
          highlighted={highlighted}
        />

      </div>

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
        {entity.kind}
      </p>

      <p className="mt-2 break-all font-mono text-sm font-semibold">
        {entity.id}
      </p>

      {recipient && (

        <div className="mt-3 border border-white/20 px-2 py-1">

          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-gray-400">
            Transaction recipient
          </p>

        </div>

      )}

    </div>
  );
}


/* =========================================================
   TRANSACTION NODE
========================================================= */

function TransactionNode({
  amount,
  className = "",
}: {
  amount?: number;
  className?: string;
}) {
  return (
    <div
      className={`z-10 flex w-[120px] flex-col items-center text-center ${className}`}
    >

      {/* TRANSACTION CIRCLE */}

      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#17191d] bg-[#17191d] font-mono text-[11px] font-semibold text-white">
        ₹
      </div>

      <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-gray-400">
        Transaction
      </p>

      <p className="mt-1 whitespace-nowrap font-mono text-sm font-semibold text-[#17191d]">
        {amount !== undefined
          ? `₹${amount.toLocaleString("en-IN")}`
          : "Transaction"}
      </p>

    </div>
  );
}


/* =========================================================
   ENTITY ICON
========================================================= */

function EntityIcon({
  kind,
  highlighted,
}: {
  kind: string;
  highlighted: boolean;
}) {
  const icon =
    kind === "account"
      ? "A"
      : kind === "phone"
        ? "P"
        : kind === "device"
          ? "D"
          : "T";

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center border font-mono text-sm font-semibold ${
        highlighted
          ? "border-white/30 bg-white/10 text-white"
          : "border-[#dfe2e6] bg-[#f8f9fa] text-[#17191d]"
      }`}
    >
      {icon}
    </div>
  );
}


/* =========================================================
   GRAPH EDGE
========================================================= */

function GraphEdge({
  x1,
  y1,
  x2,
  y2,
  label,
  highlighted = false,
  showLabel = true,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  highlighted?: boolean;
  showLabel?: boolean;
}) {
  const midX =
    (x1 + x2) / 2;

  const midY =
    (y1 + y2) / 2;

  const lineColor =
    highlighted
      ? "#17191d"
      : "#9ca3af";

  return (
    <g>

      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={lineColor}
        strokeWidth={
          highlighted
            ? "2.5"
            : "2"
        }
        markerEnd={
          highlighted
            ? "url(#arrow-transaction)"
            : "url(#arrow-normal)"
        }
      />

      {/* =================================================
          RELATIONSHIP LABEL

          Only rendered when showLabel=true.
          Transaction and recipient edges use
          showLabel=false.
      ================================================= */}

      {showLabel && label && (

        <foreignObject
          x={midX - 55}
          y={midY - 14}
          width="110"
          height="28"
        >

          <div className="flex h-full items-center justify-center">

            <span
              className={`border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] ${
                highlighted
                  ? "border-[#17191d] bg-white text-[#17191d]"
                  : "border-[#dfe2e6] bg-white text-gray-500"
              }`}
            >
              {label}
            </span>

          </div>

        </foreignObject>

      )}

    </g>
  );
}


/* =========================================================
   LEGEND
========================================================= */

function LegendDot({
  type,
  label,
}: {
  type: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">

      <span
        className={`h-2 w-2 ${
          type === "account"
            ? "bg-[#17191d]"
            : type === "phone"
              ? "bg-gray-400"
              : type === "device"
                ? "bg-gray-500"
                : "rounded-full bg-gray-700"
        }`}
      />

      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-gray-500">
        {label}
      </span>

    </div>
  );
}


/* =========================================================
   ENTITY REFERENCE
========================================================= */

function EntityReference({
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

      <p className="mt-2 break-all font-mono text-sm font-medium text-[#17191d]">
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   TAG
========================================================= */

function Tag({
  label,
}: {
  label: string;
}) {
  return (
    <span className="border border-[#dfe2e6] bg-[#f8f9fa] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-gray-500">
      {label}
    </span>
  );
}