"use client";

import {
  Network,
  Smartphone,
  UserRound,
  CreditCard,
  CircleDashed,
} from "lucide-react";

interface EntityGraphPanelProps {
  connected?: boolean;
}

export default function EntityGraphPanel({
  connected = false,
}: EntityGraphPanelProps) {
  return (
    <section className="border border-[#dfe2e6] bg-white">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#e5e7eb] px-5 py-4">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 items-center justify-center border border-[#dfe2e6] bg-[#fafafa] text-gray-600">
            <Network size={17} strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#17191d]">
              Entity relationships
            </p>

            <p className="mt-1 text-[11px] text-gray-500">
              Devices, accounts and payment identities connected to the case
            </p>
          </div>

        </div>

        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
          <CircleDashed size={12} />
          {connected ? "Graph loaded" : "Awaiting data"}
        </span>

      </div>


      {/* Graph area */}
      <div className="p-5">

        <div className="relative min-h-[360px] overflow-hidden border border-[#e5e7eb] bg-[#fafafa]">

          {/* Grid */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />


          {/* Connection lines */}
          <div className="absolute left-[27%] top-[47%] h-px w-[23%] bg-[#c7cbd1]" />

          <div className="absolute left-[50%] top-[31%] h-[16%] w-px bg-[#c7cbd1]" />

          <div className="absolute left-[50%] top-[47%] h-px w-[23%] bg-[#c7cbd1]" />

          <div className="absolute left-[50%] top-[47%] h-[22%] w-px bg-[#c7cbd1]" />


          {/* Account node */}
          <GraphNode
            icon={<UserRound size={17} />}
            label="Account"
            value="ACC-0142"
            position="left-[14%] top-[39%]"
            active={connected}
          />


          {/* Central device */}
          <GraphNode
            icon={<Smartphone size={18} />}
            label="Device"
            value="DEV-88A1"
            position="left-[42%] top-[39%]"
            active={connected}
            central
          />


          {/* Payment node */}
          <GraphNode
            icon={<CreditCard size={17} />}
            label="VPA"
            value="user@bank"
            position="left-[68%] top-[23%]"
            active={connected}
          />


          {/* Secondary device */}
          <GraphNode
            icon={<Smartphone size={17} />}
            label="Device"
            value="DEV-42C7"
            position="left-[68%] top-[39%]"
            active={connected}
          />


          {/* Shared account */}
          <GraphNode
            icon={<UserRound size={17} />}
            label="Account"
            value="ACC-0091"
            position="left-[68%] top-[62%]"
            active={connected}
          />


          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex items-center gap-4 border border-[#dfe2e6] bg-white px-3 py-2">

            <LegendItem
              icon={<UserRound size={12} />}
              label="Account"
            />

            <LegendItem
              icon={<Smartphone size={12} />}
              label="Device"
            />

            <LegendItem
              icon={<CreditCard size={12} />}
              label="Payment identity"
            />

          </div>

        </div>

      </div>


      {/* Relationship summary */}
      <div className="grid grid-cols-1 border-t border-[#e5e7eb] md:grid-cols-3 md:divide-x md:divide-[#e5e7eb]">

        <GraphMetric
          value={connected ? "5" : "—"}
          label="Entities"
        />

        <GraphMetric
          value={connected ? "4" : "—"}
          label="Relationships"
        />

        <GraphMetric
          value={connected ? "2" : "—"}
          label="Shared identifiers"
        />

      </div>


      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#e5e7eb] px-5 py-3">

        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
          Entity graph
        </span>

        <span className="text-[10px] text-gray-400">
          Relationships → Correlation
        </span>

      </div>

    </section>
  );
}


/* =============================================================
   GRAPH NODE
============================================================= */

function GraphNode({
  icon,
  label,
  value,
  position,
  active,
  central = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  position: string;
  active: boolean;
  central?: boolean;
}) {
  return (
    <div
      className={`absolute ${position} z-10 -translate-x-1/2 -translate-y-1/2 border bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        central
          ? "border-[#17191d]"
          : active
            ? "border-[#bfc4ca]"
            : "border-[#dfe2e6]"
      }`}
    >

      <div className="flex items-center gap-2">

        <div
          className={`flex h-7 w-7 items-center justify-center ${
            active ? "text-[#17191d]" : "text-gray-400"
          }`}
        >
          {icon}
        </div>

        <div>

          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-gray-400">
            {label}
          </p>

          <p className="mt-0.5 text-[11px] font-medium text-[#17191d]">
            {active ? value : "Awaiting"}
          </p>

        </div>

      </div>

    </div>
  );
}


/* =============================================================
   LEGEND ITEM
============================================================= */

function LegendItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[9px] text-gray-500">

      <span className="text-gray-400">
        {icon}
      </span>

      {label}

    </div>
  );
}


/* =============================================================
   GRAPH METRIC
============================================================= */

function GraphMetric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="px-5 py-4">

      <p className="text-lg font-semibold tracking-tight text-[#17191d]">
        {value}
      </p>

      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
        {label}
      </p>

    </div>
  );
}