"use client";

import {
  ShieldAlert,
  CircleDashed,
  ArrowRight,
  Activity,
  AlertTriangle,
} from "lucide-react";

interface AttackStatePanelProps {
  state?: string;
  confidence?: number;
  description?: string;
  indicators?: string[];
}

export default function AttackStatePanel({
  state = "Awaiting correlation",
  confidence,
  description = "The attack state will be determined after cross-stage evidence correlation.",
  indicators = [],
}: AttackStatePanelProps) {
  const hasState = state !== "Awaiting correlation";

  return (
    <section className="border border-[#dfe2e6] bg-white">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#e5e7eb] px-5 py-4">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 items-center justify-center border border-[#dfe2e6] bg-[#fafafa] text-gray-600">
            <ShieldAlert size={17} strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#17191d]">
              Attack state
            </p>

            <p className="mt-1 text-[11px] text-gray-500">
              Temporal interpretation of correlated evidence
            </p>
          </div>

        </div>

        <span
          className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] ${
            hasState ? "text-[#b42318]" : "text-gray-400"
          }`}
        >
          {hasState ? (
            <>
              <AlertTriangle size={12} />
              State identified
            </>
          ) : (
            <>
              <CircleDashed size={12} />
              Awaiting correlation
            </>
          )}
        </span>

      </div>


      {/* Current state */}
      <div className="grid grid-cols-1 border-b border-[#e5e7eb] md:grid-cols-[1fr_220px]">

        <div className="px-5 py-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Current state
          </p>

          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#17191d]">
            {state}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            {description}
          </p>

        </div>


        {/* Confidence */}
        <div className="border-t border-[#e5e7eb] px-5 py-6 md:border-l md:border-t-0">

          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Confidence
          </p>

          <div className="mt-3 flex items-end gap-1">

            <span className="text-2xl font-semibold tracking-tight text-[#17191d]">
              {confidence !== undefined ? confidence : "—"}
            </span>

            {confidence !== undefined && (
              <span className="mb-1 text-xs text-gray-400">
                %
              </span>
            )}

          </div>

          <p className="mt-1 text-[11px] text-gray-400">
            Derived from correlated evidence
          </p>

        </div>

      </div>


      {/* State progression */}
      <div className="px-5 py-5">

        <div className="mb-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Attack progression
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Case state across the investigation timeline
          </p>

        </div>


        <div className="flex flex-col md:flex-row">

          <StateNode
            label="Observed"
            active={hasState}
          />

          <StateConnector />

          <StateNode
            label="Correlated"
            active={false}
          />

          <StateConnector />

          <StateNode
            label="Attack state"
            active={false}
          />

          <StateConnector />

          <StateNode
            label="Decision"
            active={false}
          />

        </div>

      </div>


      {/* Indicators */}
      <div className="border-t border-[#e5e7eb] px-5 py-5">

        <div className="flex items-center justify-between">

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Supporting indicators
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Evidence contributing to the current attack state
            </p>
          </div>

          <Activity
            size={15}
            className="text-gray-300"
          />

        </div>


        {indicators.length === 0 ? (
          <div className="mt-4 border border-dashed border-[#d6d9dd] bg-[#fafafa] px-5 py-7 text-center">

            <p className="text-sm font-medium text-gray-500">
              No indicators available
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Supporting indicators will appear after correlation.
            </p>

          </div>
        ) : (
          <div className="mt-4 space-y-2">

            {indicators.map((indicator, index) => (
              <div
                key={index}
                className="flex items-start gap-3 border border-[#e5e7eb] px-4 py-3"
              >

                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-500" />

                <span className="text-xs leading-5 text-gray-600">
                  {indicator}
                </span>

              </div>
            ))}

          </div>
        )}

      </div>


      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#e5e7eb] px-5 py-3">

        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
          Attack-state layer
        </span>

        <span className="text-[10px] text-gray-400">
          Correlation → State
        </span>

      </div>

    </section>
  );
}


/* =============================================================
   STATE NODE
============================================================= */

function StateNode({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">

      <div
        className={`flex h-8 items-center border px-3 ${
          active
            ? "border-[#17191d] bg-[#17191d] text-white"
            : "border-[#dfe2e6] bg-white text-gray-400"
        }`}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>

    </div>
  );
}


/* =============================================================
   STATE CONNECTOR
============================================================= */

function StateConnector() {
  return (
    <div className="flex items-center px-2 py-2 text-gray-300 md:py-0">
      <ArrowRight size={14} />
    </div>
  );
}