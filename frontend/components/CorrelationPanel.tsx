"use client";

import {
  GitMerge,
  ArrowRight,
  Link2,
  AlertTriangle,
  CircleDashed,
} from "lucide-react";

interface CorrelationSignal {
  source: string;
  finding: string;
  relation: string;
}

interface CorrelationPanelProps {
  status?: "pending" | "detected";
  summary?: string;
  signals?: CorrelationSignal[];
}

export default function CorrelationPanel({
  status = "pending",
  summary = "Correlation will begin after evidence analysis.",
  signals = [],
}: CorrelationPanelProps) {
  const detected = status === "detected";

  return (
    <section className="border border-[#dfe2e6] bg-white">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#e5e7eb] px-5 py-4">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 items-center justify-center border border-[#dfe2e6] bg-[#fafafa] text-gray-600">
            <GitMerge size={17} strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#17191d]">
              Cross-stage correlation
            </p>

            <p className="mt-1 text-[11px] text-gray-500">
              Relationships between independent evidence streams
            </p>
          </div>

        </div>

        <div
          className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] ${
            detected ? "text-[#b42318]" : "text-gray-400"
          }`}
        >
          {detected ? (
            <>
              <AlertTriangle size={12} />
              Correlation detected
            </>
          ) : (
            <>
              <CircleDashed size={12} />
              Awaiting analysis
            </>
          )}
        </div>

      </div>


      {/* Summary */}
      <div className="border-b border-[#e5e7eb] px-5 py-5">

        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
          Correlation assessment
        </p>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#17191d]">
          {summary}
        </p>

      </div>


      {/* Correlation signals */}
      <div className="px-5 py-5">

        <div className="mb-4 flex items-center justify-between">

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Linked signals
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Evidence relationships identified across stages
            </p>
          </div>

          <Link2 size={15} className="text-gray-300" />

        </div>


        {signals.length === 0 ? (
          <div className="border border-dashed border-[#d6d9dd] bg-[#fafafa] px-5 py-8 text-center">

            <p className="text-sm font-medium text-gray-500">
              No correlated signals yet
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Run the case analysis to populate cross-stage relationships.
            </p>

          </div>
        ) : (
          <div className="space-y-2">

            {signals.map((signal, index) => (
              <div
                key={index}
                className="border border-[#e5e7eb] px-4 py-4"
              >

                <div className="flex flex-wrap items-center gap-2">

                  <span className="bg-[#f1f2f3] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-gray-600">
                    {signal.source}
                  </span>

                  <ArrowRight
                    size={13}
                    className="text-gray-300"
                  />

                  <span className="text-xs font-medium text-[#17191d]">
                    {signal.finding}
                  </span>

                </div>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  {signal.relation}
                </p>

              </div>
            ))}

          </div>
        )}

      </div>


      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#e5e7eb] px-5 py-3">

        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
          Correlator
        </span>

        <span className="text-[10px] text-gray-400">
          Evidence → Relationship
        </span>

      </div>

    </section>
  );
}