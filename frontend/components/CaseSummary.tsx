"use client";

import {
  ArrowUpRight,
  CircleCheck,
  Clock3,
} from "lucide-react";

interface CaseSummaryProps {
  caseStatus?: string;
  evidenceCount?: number;
  correlationStatus?: string;
  decision?: string;
}

export default function CaseSummary({
  caseStatus = "Under investigation",
  evidenceCount = 4,
  correlationStatus = "Awaiting analysis",
  decision = "Pending",
}: CaseSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

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