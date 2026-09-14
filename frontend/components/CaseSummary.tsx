"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CircleCheck,
  Clock3,
} from "lucide-react";

interface CaseSummaryProps {
  caseStatus?: string;
  evidenceCount?: number;
  correlationStatus?: string;
  decision?: string;
  riskScore?: number;
}

export default function CaseSummary({
  caseStatus = "Under investigation",
  evidenceCount = 4,
  correlationStatus = "Awaiting analysis",
  decision = "Pending",
  riskScore,
}: CaseSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

      {/* Case status */}
      <SummaryCard
        label="Case status"
        value={caseStatus}
        detail={`${evidenceCount} evidence streams`}
        icon={<Clock3 size={16} />}
      />

      {/* Correlation */}
      <SummaryCard
        label="Correlation"
        value={correlationStatus}
        detail="Cross-stage signals"
        icon={<ArrowUpRight size={16} />}
      />

      {/* Decision */}
      <SummaryCard
        label="Policy decision"
        value={decision}
        detail="Decision engine"
        icon={<CircleCheck size={16} />}
      />

      {/* Risk / confidence */}
      <div className="border border-[#dfe2e6] bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
              Risk index
            </p>

            <div className="mt-3 flex items-center gap-2">
              <p className="text-2xl font-semibold tracking-tight text-[#17191d]">
                {riskScore !== undefined ? riskScore : "—"}
              </p>

              {riskScore !== undefined && (
                <span
                  className={`text-[10px] font-semibold uppercase ${
                    riskScore >= 70
                      ? "text-[#b42318]"
                      : riskScore >= 40
                        ? "text-[#b54708]"
                        : "text-[#027a48]"
                  }`}
                >
                  {riskScore >= 70
                    ? "High"
                    : riskScore >= 40
                      ? "Moderate"
                      : "Low"}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {riskScore !== undefined
                ? "Current case assessment"
                : "Generated after analysis"}
            </p>
          </div>

          <div className="flex h-8 w-8 items-center justify-center border border-[#dfe2e6]">
            <AlertTriangle size={15} className="text-gray-500" />
          </div>
        </div>
      </div>

    </section>
  );
}


/* ---------------------------------------------------------
   Summary Card
--------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-[#dfe2e6] bg-white p-5">

      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
          {label}
        </p>

        <div className="text-gray-400">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xl font-semibold tracking-tight text-[#17191d]">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {detail}
      </p>

    </div>
  );
}