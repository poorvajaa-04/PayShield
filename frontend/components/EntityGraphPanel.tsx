"use client";

interface BackendEntity {
  id: string;
  kind: string;
  confirmed_mule?: boolean;
  dismissed?: boolean;
  risk_tier?: number;
}

interface BackendEdge {
  source: string;
  target: string;
  kind: string;
  tx_count?: number;
  tx_amount?: number;
  last_ts?: string;
}

interface EntityGraphPanelProps {
  connected: boolean;
  entities: BackendEntity[];
  edges: BackendEdge[];
}

export default function EntityGraphPanel({
  connected,
  entities,
  edges,
}: EntityGraphPanelProps) {
  const accounts = entities.filter(
    (entity) => entity.kind === "account"
  );

  const phones = entities.filter(
    (entity) => entity.kind === "phone"
  );

  const devices = entities.filter(
    (entity) => entity.kind === "device"
  );

  const transactionEdge =
    edges.find(
      (edge) => edge.kind === "transaction"
    ) ?? null;

  const sourceAccount =
    accounts.find(
      (account) =>
        account.id === transactionEdge?.source
    ) ?? accounts[0];

  const recipient =
    accounts.find(
      (account) =>
        account.id === transactionEdge?.target
    );

  const transactionAmount =
    transactionEdge?.tx_amount;

  return (
    <section className="border border-[#dfe2e6] bg-white">

      {/* HEADER */}
      <div className="flex flex-col gap-3 border-b border-[#e5e7eb] px-5 py-4 md:flex-row md:items-center md:justify-between">

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
            Entity graph
          </p>

          <p className="mt-1 text-sm font-medium text-[#17191d]">
            {entities.length} entities · {edges.length} relationships
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

      {/* GRAPH */}
      <div className="relative min-h-[560px] overflow-hidden bg-[#fafafa]">

        {/* GRID */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mx-auto h-[560px] max-w-[900px]">

          {/* SVG EDGES */}
          <svg
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            viewBox="0 0 900 560"
            preserveAspectRatio="none"
          >

            <defs>

              <marker
                id="panel-arrow-normal"
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
                id="panel-arrow-transaction"
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

            {sourceAccount && phones[0] && (
              <GraphEdge
                x1={150}
                y1={90}
                x2={450}
                y2={220}
                label="phone_link"
              />
            )}

            {sourceAccount && devices[0] && (
              <GraphEdge
                x1={750}
                y1={90}
                x2={450}
                y2={220}
                label="device_link"
              />
            )}

            {sourceAccount && transactionEdge && (
              <GraphEdge
                x1={450}
                y1={290}
                x2={450}
                y2={350}
                label="transaction"
                highlighted
              />
            )}

            {recipient && transactionEdge && (
              <GraphEdge
                x1={450}
                y1={430}
                x2={450}
                y2={490}
                label="recipient"
                highlighted
              />
            )}

          </svg>

          {/* PHONE */}
          {phones[0] && (
            <GraphNode
              entity={phones[0]}
              className="absolute left-[16.7%] top-[16%] -translate-x-1/2 -translate-y-1/2"
            />
          )}

          {/* DEVICE */}
          {devices[0] && (
            <GraphNode
              entity={devices[0]}
              className="absolute left-[83.3%] top-[16%] -translate-x-1/2 -translate-y-1/2"
            />
          )}

          {/* SOURCE ACCOUNT */}
          {sourceAccount && (
            <GraphNode
              entity={sourceAccount}
              className="absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2"
            />
          )}

          {/* TRANSACTION */}
          {transactionEdge && (
            <TransactionNode
              amount={transactionAmount}
              className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2"
            />
          )}

          {/* RECIPIENT */}
          {recipient && (
            <GraphNode
              entity={recipient}
              highlighted
              recipient
              className="absolute left-1/2 top-[94%] -translate-x-1/2 -translate-y-1/2"
            />
          )}

        </div>

      </div>

      {/* FOOTER */}
      <div className="border-t border-[#e5e7eb] px-5 py-4">

        <p className="text-xs text-gray-500">
          Relationships shown here are derived from the PayShield
          investigation graph.
        </p>

      </div>

    </section>
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
  entity: BackendEntity;
  highlighted?: boolean;
  recipient?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`z-10 w-[180px] border px-5 py-5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        highlighted
          ? "border-[#17191d] bg-[#17191d] text-white"
          : "border-[#dfe2e6] bg-white text-[#17191d]"
      } ${className}`}
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
      className={`z-10 flex h-[74px] w-[74px] items-center justify-center rounded-full border border-[#17191d] bg-[#17191d] text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${className}`}
    >

      <div>

        <p className="font-mono text-[11px] font-semibold text-white">
          ₹
        </p>

        <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-gray-400">
          {amount !== undefined
            ? amount.toLocaleString("en-IN")
            : "Transaction"}
        </p>

      </div>

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
      className={`flex h-9 w-9 items-center justify-center border font-mono text-sm font-semibold ${
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
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  highlighted?: boolean;
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const lineColor = highlighted
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
        strokeWidth={highlighted ? "2.5" : "2"}
        markerEnd={
          highlighted
            ? "url(#panel-arrow-transaction)"
            : "url(#panel-arrow-normal)"
        }
      />

      <foreignObject
        x={midX - 50}
        y={midY - 12}
        width="100"
        height="24"
      >

        <div className="flex h-full items-center justify-center">

          <span
            className={`border bg-white px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] ${
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