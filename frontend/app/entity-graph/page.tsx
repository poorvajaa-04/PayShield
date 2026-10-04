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

interface GraphPosition {
  x: number;
  y: number;
}

const NODE_WIDTH = 176;
const NODE_HEIGHT = 72;

const GRAPH_COLUMNS = 6;
const GRAPH_COLUMN_GAP = 220;
const GRAPH_ROW_GAP = 145;
const GRAPH_LEFT = 120;
const GRAPH_TOP = 90;

const GRAPH_WIDTH =
  GRAPH_LEFT * 2 +
  (GRAPH_COLUMNS - 1) * GRAPH_COLUMN_GAP +
  NODE_WIDTH;

const GRAPH_ROWS = 5;

const GRAPH_HEIGHT =
  GRAPH_TOP * 2 +
  (GRAPH_ROWS - 1) * GRAPH_ROW_GAP +
  NODE_HEIGHT;

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
          `${apiUrl.replace(/\/$/, "")}/investigations/PS-REAL-001`,
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

  /*
   * ---------------------------------------------------------
   * ENTITY / EDGE DERIVED DATA
   *
   * IMPORTANT:
   *
   * Do not select only the first entity or first edge.
   *
   * The backend already returns the complete graph.
   * The frontend must visualize that graph rather than
   * creating a simplified demonstration graph.
   * ---------------------------------------------------------
   */

  const accountCount = useMemo(
    () =>
      entities.filter(
        (entity) => entity.kind === "account"
      ).length,
    [entities]
  );

  const phoneCount = useMemo(
    () =>
      entities.filter(
        (entity) => entity.kind === "phone"
      ).length,
    [entities]
  );

  const deviceCount = useMemo(
    () =>
      entities.filter(
        (entity) => entity.kind === "device"
      ).length,
    [entities]
  );

  const transactionEntityCount = useMemo(
    () =>
      entities.filter(
        (entity) => entity.kind === "transaction"
      ).length,
    [entities]
  );

  const sharedIdentifiers =
    useMemo(
      () =>
        entities.filter(
          (entity) =>
            entity.kind === "phone" ||
            entity.kind === "device"
        ),
      [entities]
    );

  /*
   * The backend evidence contains multiple historical
   * graph observations.
   *
   * For the summary card, use the latest observation
   * available for the evaluated recipient.
   */
  const recipientId =
    useMemo(() => {
      for (
        let index = edges.length - 1;
        index >= 0;
        index--
      ) {
        if (edges[index].kind === "transaction") {
          return edges[index].target;
        }
      }

      for (
        let index = investigation?.evidence.length ?? 0;
        index > 0;
        index--
      ) {
        const evidence =
          investigation?.evidence[index - 1];

        if (
          evidence?.stream === "entity_graph" &&
          evidence.to_account
        ) {
          return evidence.to_account;
        }
      }

      return undefined;
    }, [
      edges,
      investigation?.evidence,
    ]);

  const recipient =
    useMemo(
      () =>
        entities.find(
          (entity) =>
            entity.id === recipientId
        ),
      [entities, recipientId]
    );

  const recipientEvidence =
    useMemo(() => {
      if (!recipientId) {
        return undefined;
      }

      for (
        let index =
          investigation?.evidence.length ?? 0;
        index > 0;
        index--
      ) {
        const evidence =
          investigation?.evidence[index - 1];

        if (
          evidence?.stream ===
            "entity_graph" &&
          evidence.to_account === recipientId
        ) {
          return evidence;
        }
      }

      return undefined;
    }, [
      investigation?.evidence,
      recipientId,
    ]);

  /*
   * ---------------------------------------------------------
   * GRAPH LAYOUT
   *
   * The layout is deterministic.
   *
   * Every backend entity gets exactly one visual node.
   * Every backend edge is rendered between the corresponding
   * visual nodes.
   *
   * This deliberately avoids introducing a graph library
   * dependency for the prototype.
   * ---------------------------------------------------------
   */

  const positions =
    useMemo(() => {
      const map =
        new Map<string, GraphPosition>();

      entities.forEach(
        (entity, index) => {
          const column =
            index % GRAPH_COLUMNS;

          const row =
            Math.floor(
              index / GRAPH_COLUMNS
            );

          map.set(entity.id, {
            x:
              GRAPH_LEFT +
              column *
                GRAPH_COLUMN_GAP,
            y:
              GRAPH_TOP +
              row *
                GRAPH_ROW_GAP,
          });
        }
      );

      return map;
    }, [entities]);

  const getNodeCenter =
    (entityId: string) => {
      const position =
        positions.get(entityId);

      if (!position) {
        return null;
      }

      return {
        x:
          position.x +
          NODE_WIDTH / 2,
        y:
          position.y +
          NODE_HEIGHT / 2,
      };
    };

  const getEdgePoints =
    (edge: Edge) => {
      const source =
        getNodeCenter(edge.source);

      const target =
        getNodeCenter(edge.target);

      if (!source || !target) {
        return null;
      }

      const dx =
        target.x - source.x;

      const dy =
        target.y - source.y;

      const distance =
        Math.sqrt(
          dx * dx + dy * dy
        );

      if (distance === 0) {
        return null;
      }

      const ux =
        dx / distance;

      const uy =
        dy / distance;

      /*
       * Approximate rectangular-node intersection.
       *
       * This keeps the relationship line outside
       * the node rather than drawing through it.
       */
      const halfWidth =
        NODE_WIDTH / 2;

      const halfHeight =
        NODE_HEIGHT / 2;

      const scale =
        Math.min(
          halfWidth /
            Math.abs(ux || 0.0001),
          halfHeight /
            Math.abs(uy || 0.0001)
        );

      return {
        x1:
          source.x +
          ux * scale,

        y1:
          source.y +
          uy * scale,

        x2:
          target.x -
          ux * scale,

        y2:
          target.y -
          uy * scale,
      };
    };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

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

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                    Explore the complete account,
                    device, phone and transaction
                    relationship graph returned by
                    the PayShield entity engine.
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
                  Run the real case from the
                  Overview page first.
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
                  Retrieving entity relationships
                  from PayShield.
                </p>
              </div>
            )}

            {investigation && !loading && (
              <>

                {/* =================================================
                    GRAPH SUMMARY
                ================================================= */}

                <section>
                  <SectionHeader
                    eyebrow="Graph overview"
                    title="Case entity structure"
                    description="Complete entity and relationship counts returned by the investigation."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">

                    <MetricCard
                      label="Entities"
                      value={String(
                        entities.length
                      )}
                    />

                    <MetricCard
                      label="Relationships"
                      value={String(
                        edges.length
                      )}
                    />

                    <MetricCard
                      label="Accounts"
                      value={String(
                        accountCount
                      )}
                    />

                    <MetricCard
                      label="Shared identifiers"
                      value={String(
                        sharedIdentifiers.length
                      )}
                    />

                    <MetricCard
                      label="Recipient"
                      value={
                        recipientId ??
                        "—"
                      }
                    />

                  </div>
                </section>

                {/* =================================================
                    ENTITY TYPE SUMMARY
                ================================================= */}

                <section className="mt-6">
                  <div className="flex flex-wrap gap-3">

                    <SummaryTag
                      label="Accounts"
                      value={accountCount}
                    />

                    <SummaryTag
                      label="Phones"
                      value={phoneCount}
                    />

                    <SummaryTag
                      label="Devices"
                      value={deviceCount}
                    />

                    <SummaryTag
                      label="Transactions"
                      value={
                        transactionEntityCount
                      }
                    />

                    <SummaryTag
                      label="Edges"
                      value={edges.length}
                    />

                  </div>
                </section>

                {/* =================================================
                    ACTUAL GRAPH
                ================================================= */}

                <section className="mt-10">
                  <SectionHeader
                    eyebrow="Relationship graph"
                    title="Complete connected-entity view"
                    description="Every entity and every relationship returned by the PayShield entity graph is rendered here. The selected transaction recipient is highlighted."
                  />

                  <div className="border border-[#dfe2e6] bg-white">

                    {/* GRAPH HEADER */}

                    <div className="flex flex-col gap-4 border-b border-[#e5e7eb] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                          Graph model
                        </p>

                        <p className="mt-1 text-sm font-medium text-[#17191d]">
                          {entities.length} entities ·{" "}
                          {edges.length} relationships
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

                        {recipientId && (
                          <LegendDot
                            type="recipient"
                            label="Evaluated recipient"
                          />
                        )}

                      </div>
                    </div>

                    {/* =================================================
                        GRAPH CANVAS
                    ================================================= */}

                    <div className="overflow-auto bg-[#fafafa]">

                      <div
                        className="relative"
                        style={{
                          width:
                            GRAPH_WIDTH,
                          height:
                            GRAPH_HEIGHT,
                        }}
                      >

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

                        {/* =================================================
                            RELATIONSHIP LINES
                        ================================================= */}

                        <svg
                          className="pointer-events-none absolute inset-0 z-0"
                          width={GRAPH_WIDTH}
                          height={GRAPH_HEIGHT}
                          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                        >
                          <defs>

                            <marker
                              id="graph-arrow"
                              markerWidth="8"
                              markerHeight="8"
                              refX="7"
                              refY="4"
                              orient="auto"
                              markerUnits="strokeWidth"
                            >
                              <path
                                d="M0,0 L8,4 L0,8 z"
                                fill="#8b929b"
                              />
                            </marker>

                            <marker
                              id="graph-arrow-highlight"
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

                          {edges.map(
                            (edge, index) => {
                              const points =
                                getEdgePoints(
                                  edge
                                );

                              if (!points) {
                                return null;
                              }

                              const highlighted =
                                Boolean(
                                  recipientId &&
                                  (
                                    edge.source ===
                                      recipientId ||
                                    edge.target ===
                                      recipientId
                                  )
                                );

                              const midX =
                                (
                                  points.x1 +
                                  points.x2
                                ) / 2;

                              const midY =
                                (
                                  points.y1 +
                                  points.y2
                                ) / 2;

                              return (
                                <g
                                  key={`${edge.source}-${edge.target}-${edge.kind}-${index}`}
                                >

                                  <line
                                    x1={
                                      points.x1
                                    }
                                    y1={
                                      points.y1
                                    }
                                    x2={
                                      points.x2
                                    }
                                    y2={
                                      points.y2
                                    }
                                    stroke={
                                      highlighted
                                        ? "#17191d"
                                        : "#9ca3af"
                                    }
                                    strokeWidth={
                                      highlighted
                                        ? 2.5
                                        : 1.7
                                    }
                                    markerEnd={
                                      highlighted
                                        ? "url(#graph-arrow-highlight)"
                                        : "url(#graph-arrow)"
                                    }
                                  />

                                  <text
                                    x={midX}
                                    y={midY - 6}
                                    textAnchor="middle"
                                    className="fill-gray-500 font-mono"
                                    style={{
                                      fontSize:
                                        9,
                                      paintOrder:
                                        "stroke",
                                      stroke:
                                        "#fafafa",
                                      strokeWidth:
                                        4,
                                      strokeLinecap:
                                        "round",
                                      strokeLinejoin:
                                        "round",
                                    }}
                                  >
                                    {edge.kind}
                                  </text>

                                  {typeof edge.tx_count ===
                                    "number" && (
                                    <text
                                      x={midX}
                                      y={midY + 9}
                                      textAnchor="middle"
                                      className="fill-gray-400 font-mono"
                                      style={{
                                        fontSize:
                                          8,
                                        paintOrder:
                                          "stroke",
                                        stroke:
                                          "#fafafa",
                                        strokeWidth:
                                          3,
                                      }}
                                    >
                                      {edge.tx_count}{" "}
                                      tx
                                    </text>
                                  )}

                                </g>
                              );
                            }
                          )}

                        </svg>

                        {/* =================================================
                            ENTITY NODES
                        ================================================= */}

                        {entities.map(
                          (entity) => {
                            const position =
                              positions.get(
                                entity.id
                              );

                            if (!position) {
                              return null;
                            }

                            const isRecipient =
                              entity.id ===
                              recipientId;

                            return (
                              <GraphNode
                                key={entity.id}
                                entity={entity}
                                recipient={
                                  isRecipient
                                }
                                style={{
                                  left:
                                    position.x,
                                  top:
                                    position.y,
                                }}
                              />
                            );
                          }
                        )}

                      </div>
                    </div>

                    {/* GRAPH FOOTER */}

                    <div className="border-t border-[#e5e7eb] px-5 py-4">

                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">

                        <p className="text-xs leading-5 text-gray-500">
                          The visualization is generated
                          directly from the entities and
                          relationships returned by the
                          PayShield backend.
                        </p>

                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
                          {entities.length} nodes ·{" "}
                          {edges.length} edges
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
                    title="All entities"
                    description="Individual identities returned by the investigation graph."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                    {entities.map(
                      (entity) => (
                        <div
                          key={entity.id}
                          className={`border bg-white px-5 py-5 ${
                            entity.id ===
                            recipientId
                              ? "border-[#17191d]"
                              : "border-[#dfe2e6]"
                          }`}
                        >

                          <div className="flex items-start justify-between gap-3">

                            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
                              {entity.kind}
                            </p>

                            {entity.id ===
                              recipientId && (
                              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#17191d]">
                                Recipient
                              </span>
                            )}

                          </div>

                          <p className="mt-3 break-all font-mono text-sm font-semibold text-[#17191d]">
                            {entity.id}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">

                            {entity.confirmed_mule && (
                              <Tag
                                label="Confirmed mule"
                              />
                            )}

                            {entity.dismissed && (
                              <Tag
                                label="Dismissed"
                              />
                            )}

                            {entity.risk_tier !==
                              undefined && (
                              <Tag
                                label={`Risk tier ${entity.risk_tier}`}
                              />
                            )}

                          </div>

                        </div>
                      )
                    )}

                  </div>
                </section>

                {/* =================================================
                    RELATIONSHIPS
                ================================================= */}

                <section className="mt-10">
                  <SectionHeader
                    eyebrow="Relationship layer"
                    title="All graph relationships"
                    description="Every edge returned by the PayShield entity graph."
                  />

                  <div className="border border-[#dfe2e6] bg-white">

                    {edges.length === 0 ? (
                      <div className="px-5 py-8 text-sm text-gray-500">
                        No explicit graph relationships
                        were returned by the backend.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#e5e7eb]">

                        {edges.map(
                          (
                            edge,
                            index
                          ) => (
                            <div
                              key={`${edge.source}-${edge.target}-${edge.kind}-${index}`}
                              className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-[1fr_180px_1fr]"
                            >

                              <EntityReference
                                label="Source"
                                value={
                                  edge.source
                                }
                              />

                              <div className="flex items-center justify-center">
                                <span className="border border-[#dfe2e6] bg-[#f8f9fa] px-3 py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.08em] text-gray-500">
                                  {edge.kind}

                                  {typeof edge.tx_count ===
                                    "number" && (
                                    <span className="ml-2 text-gray-400">
                                      ×
                                      {edge.tx_count}
                                    </span>
                                  )}
                                </span>
                              </div>

                              <EntityReference
                                label="Target"
                                value={
                                  edge.target
                                }
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
                    description="Latest graph evidence recorded for the evaluated receiving account."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">

                    <MetricCard
                      label="Recipient"
                      value={
                        recipientId ??
                        "—"
                      }
                    />

                    <MetricCard
                      label="PageRank"
                      value={
                        typeof recipientEvidence?.pagerank ===
                          "number"
                          ? recipientEvidence.pagerank.toFixed(
                              4
                            )
                          : "—"
                      }
                    />

                    <MetricCard
                      label="Betweenness"
                      value={
                        typeof recipientEvidence?.betweenness ===
                          "number"
                          ? recipientEvidence.betweenness.toFixed(
                              4
                            )
                          : "—"
                      }
                    />

                    <MetricCard
                      label="Community"
                      value={
                        recipientEvidence?.community_id !==
                          undefined &&
                        recipientEvidence.community_id !==
                          null
                          ? `#${recipientEvidence.community_id}`
                          : "—"
                      }
                    />

                    <MetricCard
                      label="Structural hub"
                      value={
                        recipientEvidence?.is_structural_hub ===
                          true
                          ? "Yes"
                          : recipientEvidence?.is_structural_hub ===
                              false
                            ? "No"
                            : "—"
                      }
                    />

                  </div>

                  {recipientEvidence && (
                    <div className="mt-4 border border-[#dfe2e6] bg-white px-5 py-5">

                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
                        Evidence interpretation
                      </p>

                      <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
                        Graph metrics are recorded as
                        evidence snapshots during case
                        progression. Historical snapshots may
                        differ as the transaction graph grows;
                        they should not be interpreted as
                        contradictory observations.
                      </p>

                    </div>
                  )}

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
                    The entity graph remains an evidence
                    source. It does not independently make
                    the final policy decision.
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
   SUMMARY TAG
========================================================= */

function SummaryTag({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-[#dfe2e6] bg-white px-3 py-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-gray-400">
        {label}
      </span>

      <span className="ml-2 font-mono text-xs font-semibold text-[#17191d]">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   GRAPH NODE
========================================================= */

function GraphNode({
  entity,
  recipient,
  style,
}: {
  entity: Entity;
  recipient: boolean;
  style: {
    left: number;
    top: number;
  };
}) {
  return (
    <div
      className={`absolute z-10 flex flex-col justify-center border px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        recipient
          ? "border-[#17191d] bg-[#17191d] text-white"
          : "border-[#dfe2e6] bg-white text-[#17191d]"
      }`}
      style={{
        ...style,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      }}
    >
      <div className="flex items-center justify-between gap-2">

        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-[10px] font-semibold ${
            recipient
              ? "border-white/20 bg-white/10 text-white"
              : "border-[#dfe2e6] bg-[#f8f9fa] text-[#17191d]"
          }`}
        >
          {getEntityInitial(
            entity.kind
          )}
        </div>

        <p
          className={`min-w-0 truncate font-mono text-[8px] uppercase tracking-[0.08em] ${
            recipient
              ? "text-gray-300"
              : "text-gray-400"
          }`}
        >
          {entity.kind}
        </p>

      </div>

      <p
        className={`mt-2 truncate font-mono text-[11px] font-semibold ${
          recipient
            ? "text-white"
            : "text-[#17191d]"
        }`}
        title={entity.id}
      >
        {entity.id}
      </p>

      {recipient && (
        <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-gray-400">
          evaluated recipient
        </p>
      )}
    </div>
  );
}

/* =========================================================
   ENTITY ICON / INITIAL
========================================================= */

function getEntityInitial(
  kind: string
) {
  if (kind === "account") {
    return "A";
  }

  if (kind === "phone") {
    return "P";
  }

  if (kind === "device") {
    return "D";
  }

  if (kind === "transaction") {
    return "T";
  }

  return "?";
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
  const className =
    type === "account"
      ? "bg-[#17191d]"
      : type === "phone"
        ? "bg-gray-400"
        : type === "device"
          ? "bg-gray-500"
          : type === "recipient"
            ? "bg-[#17191d]"
            : "rounded-full bg-gray-700";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 ${className}`}
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