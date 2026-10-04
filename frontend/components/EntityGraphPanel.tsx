"use client";

interface BackendEntity {
  id: string;
  kind: string;
  confirmed_mule?: boolean;
  dismissed?: boolean;
  risk_tier?: number;
  [key: string]: unknown;
}

interface BackendEdge {
  source: string;
  target: string;
  kind: string;
  tx_count?: number;
  tx_amount?: number;
  last_ts?: string;
  [key: string]: unknown;
}

interface EntityGraphPanelProps {
  connected: boolean;
  entities: BackendEntity[];
  edges: BackendEdge[];
}

/* =========================================================
   ENTITY GRAPH PANEL
========================================================= */

export default function EntityGraphPanel({
  connected,
  entities,
  edges,
}: EntityGraphPanelProps) {
  /*
   * The backend currently returns account entities with
   * transaction relationships between them.
   *
   * Phones, devices and VPAs are supported by the frontend
   * and will automatically appear when the backend returns
   * those entity types.
   */

  const accounts = entities.filter(
    (entity) => entity.kind === "account"
  );

  const phones = entities.filter(
    (entity) => entity.kind === "phone"
  );

  const devices = entities.filter(
    (entity) => entity.kind === "device"
  );

  const vpas = entities.filter(
    (entity) => entity.kind === "vpa"
  );

  const transactionEdges = edges.filter(
    (edge) => edge.kind === "transaction"
  );

  /*
   * Find the evaluated recipient from the transaction
   * relationship layer.
   *
   * The graph does not assume a hard-coded account ID.
   */
  const recipientId =
    [...transactionEdges]
      .reverse()
      .find((edge) => edge.target)
      ?.target ?? null;

  const recipient =
    accounts.find(
      (account) => account.id === recipientId
    ) ?? null;

  return (
    <section className="border border-[#dfe2e6] bg-white">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-3 border-b border-[#e5e7eb] px-5 py-4 md:flex-row md:items-center md:justify-between">

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
            Entity graph
          </p>

          <p className="mt-1 text-sm font-medium text-[#17191d]">
            {entities.length} entities · {edges.length} relationships
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Backend-returned entity relationships
          </p>
        </div>

        <div className="flex items-center gap-2">

          <span
            className={`h-2 w-2 ${
              connected
                ? "bg-[#17191d]"
                : "bg-gray-400"
            }`}
          />

          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-500">
            {connected
              ? "Backend connected"
              : "Backend unavailable"}
          </span>

        </div>

      </div>


      {/* =====================================================
          GRAPH SUMMARY
      ===================================================== */}

      <div className="grid grid-cols-2 border-b border-[#e5e7eb] md:grid-cols-6">

        <GraphStat
          label="Entities"
          value={entities.length}
        />

        <GraphStat
          label="Accounts"
          value={accounts.length}
        />

        <GraphStat
          label="Phones"
          value={phones.length}
        />

        <GraphStat
          label="Devices"
          value={devices.length}
        />

        <GraphStat
          label="VPAs"
          value={vpas.length}
        />

        <GraphStat
          label="Tx edges"
          value={transactionEdges.length}
        />

      </div>


      {/* =====================================================
          GRAPH
      ===================================================== */}

      <div className="relative overflow-hidden bg-[#fafafa]">

        {/* GRID */}

        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative min-h-[620px] overflow-auto p-8">

          {entities.length === 0 ? (

            <div className="flex min-h-[540px] items-center justify-center">

              <div className="border border-[#dfe2e6] bg-white px-8 py-7 text-center">

                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                  No graph data
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  The PayShield backend returned no entities.
                </p>

              </div>

            </div>

          ) : (

            <DynamicGraph
              entities={entities}
              edges={edges}
              recipientId={recipientId}
            />

          )}

        </div>

      </div>


      {/* =====================================================
          GRAPH INTERPRETATION
      ===================================================== */}

      <div className="border-t border-[#e5e7eb] px-5 py-4">

        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">

          <div>

            <p className="text-xs text-gray-500">
              Relationships shown here are derived directly from
              the PayShield investigation graph.
            </p>

            {recipient && (
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-gray-400">
                Evaluated recipient: {recipient.id}
              </p>
            )}

          </div>

          <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-gray-400">
            {entities.length} nodes · {edges.length} edges
          </div>

        </div>

      </div>


      {/* =====================================================
          ENTITY INVENTORY
      ===================================================== */}

      <div className="border-t border-[#e5e7eb]">

        <div className="border-b border-[#e5e7eb] px-5 py-4">

          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
            Entity inventory
          </p>

          <p className="mt-1 text-sm font-medium text-[#17191d]">
            All entities returned by the investigation graph
          </p>

        </div>

        <div className="divide-y divide-[#e5e7eb]">

          {entities.map((entity) => {

            const isRecipient =
              entity.id === recipientId;

            return (
              <div
                key={entity.id}
                className={`flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between ${
                  isRecipient
                    ? "bg-[#fafafa]"
                    : "bg-white"
                }`}
              >

                <div className="flex items-center gap-3">

                  <EntityIcon
                    kind={entity.kind}
                    highlighted={isRecipient}
                  />

                  <div>

                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
                      {entity.kind}
                    </p>

                    <p className="mt-1 font-mono text-xs font-semibold text-[#17191d]">
                      {entity.id}
                    </p>

                  </div>

                </div>


                <div className="flex items-center gap-4">

                  {isRecipient && (
                    <span className="border border-[#17191d] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#17191d]">
                      Evaluated recipient
                    </span>
                  )}

                  {entity.kind === "account" &&
                    entity.risk_tier !== undefined && (
                      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-gray-400">
                        Risk tier {entity.risk_tier}
                      </span>
                    )}

                </div>

              </div>
            );

          })}

        </div>

      </div>


      {/* =====================================================
          RELATIONSHIP INVENTORY
      ===================================================== */}

      <div className="border-t border-[#e5e7eb]">

        <div className="border-b border-[#e5e7eb] px-5 py-4">

          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
            Relationship layer
          </p>

          <p className="mt-1 text-sm font-medium text-[#17191d]">
            All graph relationships
          </p>

        </div>

        <div className="divide-y divide-[#e5e7eb]">

          {edges.map((edge, index) => {

            const highlighted =
              edge.target === recipientId ||
              edge.source === recipientId;

            return (
              <div
                key={`${edge.source}-${edge.target}-${index}`}
                className={`grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[1fr_auto_1fr] md:items-center ${
                  highlighted
                    ? "bg-[#fafafa]"
                    : "bg-white"
                }`}
              >

                {/* SOURCE */}

                <div>

                  <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-gray-400">
                    Source
                  </p>

                  <p className="mt-1 break-all font-mono text-xs font-semibold text-[#17191d]">
                    {edge.source}
                  </p>

                </div>


                {/* RELATIONSHIP */}

                <div className="flex items-center justify-center">

                  <span
                    className={`border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.06em] ${
                      highlighted
                        ? "border-[#17191d] text-[#17191d]"
                        : "border-[#dfe2e6] text-gray-500"
                    }`}
                  >
                    {edge.kind}
                    {edge.kind === "transaction" &&
                      ` ×${edge.tx_count ?? 1}`}
                  </span>

                </div>


                {/* TARGET */}

                <div className="md:text-right">

                  <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-gray-400">
                    Target
                  </p>

                  <p className="mt-1 break-all font-mono text-xs font-semibold text-[#17191d]">
                    {edge.target}
                  </p>

                </div>

              </div>
            );

          })}

        </div>

      </div>

    </section>
  );
}


/* =========================================================
   GRAPH STAT
========================================================= */

function GraphStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border-r border-[#e5e7eb] px-4 py-4 last:border-r-0">

      <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 font-mono text-lg font-semibold text-[#17191d]">
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   DYNAMIC GRAPH
========================================================= */

function DynamicGraph({
  entities,
  edges,
  recipientId,
}: {
  entities: BackendEntity[];
  edges: BackendEdge[];
  recipientId: string | null;
}) {
  /*
   * Visualization-only layout.
   *
   * No relationships are inferred here.
   * Every rendered edge comes directly from the backend.
   */

  const width = Math.max(
    1200,
    entities.length * 75
  );

  const height = 700;

  const centerX = width / 2;
  const centerY = height / 2;

  const positions = new Map<
    string,
    { x: number; y: number }
  >();

  const accounts = entities.filter(
    (entity) => entity.kind === "account"
  );

  const identifiers = entities.filter(
    (entity) =>
      entity.kind === "phone" ||
      entity.kind === "vpa"
  );

  const devices = entities.filter(
    (entity) => entity.kind === "device"
  );


  /* =======================================================
     ACCOUNT LAYOUT
  ======================================================= */

  accounts.forEach((entity, index) => {

    const count = accounts.length;

    const angle =
      (Math.PI * 2 * index) /
      Math.max(count, 1);

    const radius =
      count <= 5
        ? 190
        : Math.min(
            300,
            145 + count * 6
          );

    positions.set(entity.id, {

      x:
        centerX +
        Math.cos(angle) * radius,

      y:
        centerY +
        Math.sin(angle) * radius,

    });

  });


  /* =======================================================
     PHONE / VPA LAYOUT
  ======================================================= */

  identifiers.forEach((entity, index) => {

    const count = identifiers.length;

    const spacing =
      width /
      Math.max(
        count + 1,
        2
      );

    positions.set(entity.id, {

      x:
        spacing *
        (index + 1),

      y: 70,

    });

  });


  /* =======================================================
     DEVICE LAYOUT
  ======================================================= */

  devices.forEach((entity, index) => {

    const count = devices.length;

    const spacing =
      width /
      Math.max(
        count + 1,
        2
      );

    positions.set(entity.id, {

      x:
        spacing *
        (index + 1),

      y:
        height - 70,

    });

  });


  return (
    <div
      className="relative"
      style={{
        width,
        height,
      }}
    >

      {/* ===================================================
          SVG RELATIONSHIPS
      =================================================== */}

      <svg
        className="absolute inset-0 z-0"
        width={width}
        height={height}
      >

        <defs>

          <marker
            id="entity-arrow"
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
            id="entity-arrow-highlight"
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


        {edges.map((edge, index) => {

          const source =
            positions.get(
              edge.source
            );

          const target =
            positions.get(
              edge.target
            );

          /*
           * If the backend returns an edge whose entities
           * are not present in the entity list, skip it
           * instead of creating an invalid SVG line.
           */

          if (!source || !target) {
            return null;
          }

          const highlighted =
            edge.target === recipientId ||
            edge.source === recipientId;

          return (
            <GraphRelationship
              key={`${edge.source}-${edge.target}-${index}`}
              source={source}
              target={target}
              edge={edge}
              highlighted={highlighted}
            />
          );

        })}

      </svg>


      {/* ===================================================
          ENTITY NODES
      =================================================== */}

      {entities.map((entity) => {

        const position =
          positions.get(
            entity.id
          );

        if (!position) {
          return null;
        }

        const highlighted =
          entity.id === recipientId;

        return (
          <GraphNode
            key={entity.id}
            entity={entity}
            highlighted={highlighted}
            style={{
              left: position.x,
              top: position.y,
            }}
          />
        );

      })}

    </div>
  );
}


/* =========================================================
   GRAPH NODE
========================================================= */

function GraphNode({
  entity,
  highlighted,
  style,
}: {
  entity: BackendEntity;
  highlighted: boolean;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...style,
        transform:
          "translate(-50%, -50%)",
      }}
      className={`absolute z-10 w-[170px] border px-4 py-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${
        highlighted
          ? "border-[#17191d] bg-[#17191d] text-white"
          : "border-[#dfe2e6] bg-white text-[#17191d]"
      }`}
    >

      {/* ===================================================
          ICON
      =================================================== */}

      <div className="flex justify-center">

        <EntityIcon
          kind={entity.kind}
          highlighted={highlighted}
        />

      </div>


      {/* ===================================================
          TYPE
      =================================================== */}

      <p
        className={`mt-2 font-mono text-[8px] uppercase tracking-[0.12em] ${
          highlighted
            ? "text-gray-400"
            : "text-gray-400"
        }`}
      >
        {entity.kind}
      </p>


      {/* ===================================================
          ID
      =================================================== */}

      <p
        className={`mt-1 break-all font-mono text-[11px] font-semibold ${
          highlighted
            ? "text-white"
            : "text-[#17191d]"
        }`}
      >
        {entity.id}
      </p>


      {/* ===================================================
          RISK
      =================================================== */}

      {entity.kind === "account" &&
        entity.risk_tier !== undefined && (

          <p
            className={`mt-2 font-mono text-[8px] uppercase tracking-[0.08em] ${
              highlighted
                ? "text-gray-400"
                : "text-gray-400"
            }`}
          >
            Risk tier {entity.risk_tier}
          </p>

        )}


      {/* ===================================================
          RECIPIENT
      =================================================== */}

      {highlighted && (

        <div className="mt-2 border border-white/20 px-2 py-1">

          <p className="font-mono text-[7px] uppercase tracking-[0.1em] text-gray-400">
            Evaluated recipient
          </p>

        </div>

      )}

    </div>
  );
}


/* =========================================================
   GRAPH RELATIONSHIP
========================================================= */

function GraphRelationship({
  source,
  target,
  edge,
  highlighted,
}: {
  source: { x: number; y: number };
  target: { x: number; y: number };
  edge: BackendEdge;
  highlighted: boolean;
}) {
  const midX =
    (source.x + target.x) / 2;

  const midY =
    (source.y + target.y) / 2;

  const lineColor =
    highlighted
      ? "#17191d"
      : "#9ca3af";

  const label =
    edge.kind === "transaction"
      ? `transaction ×${edge.tx_count ?? 1}`
      : edge.kind;

  return (
    <g>

      {/* ===================================================
          RELATIONSHIP LINE
      =================================================== */}

      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={lineColor}
        strokeWidth={
          highlighted
            ? 2.5
            : 1.5
        }
        markerEnd={
          highlighted
            ? "url(#entity-arrow-highlight)"
            : "url(#entity-arrow)"
        }
      />


      {/* ===================================================
          EDGE LABEL
      =================================================== */}

      <foreignObject
        x={midX - 55}
        y={midY - 12}
        width="110"
        height="24"
      >

        <div className="flex h-full items-center justify-center">

          <span
            className={`border bg-white px-2 py-1 font-mono text-[7px] uppercase tracking-[0.06em] ${
              highlighted
                ? "border-[#17191d] text-[#17191d]"
                : "border-[#dfe2e6] text-gray-500"
            }`}
          >
            {label}
          </span>

        </div>

      </foreignObject>

    </g>
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
          : kind === "vpa"
            ? "V"
            : "E";

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center border font-mono text-sm font-semibold ${
        highlighted
          ? "border-white/30 bg-white/10 text-white"
          : "border-[#dfe2e6] bg-[#f8f9fa] text-[#17191d]"
      }`}
    >
      {icon}
    </div>
  );
}