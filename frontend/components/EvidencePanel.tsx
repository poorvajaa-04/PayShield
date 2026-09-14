"use client";

import {
  Activity,
  Smartphone,
  MessageSquareWarning,
  CreditCard,
  CheckCircle2,
  CircleDashed,
  ChevronRight,
} from "lucide-react";

type EvidenceStatus = "active" | "pending" | "clear";

interface EvidencePanelProps {
  type: "lure" | "network" | "transaction" | "device";
  status?: EvidenceStatus;
  signal?: string;
  observations?: string[];
}

const evidenceConfig = {
  lure: {
    label: "Lure / Social Engineering",
    shortLabel: "LURE",
    description: "Messages, impersonation and coercion signals",
    icon: MessageSquareWarning,
  },

  network: {
    label: "Network",
    shortLabel: "NETWORK",
    description: "Traffic behaviour and connection anomalies",
    icon: Activity,
  },

  transaction: {
    label: "Transaction",
    shortLabel: "TRANSACTION",
    description: "Payment and transaction behaviour",
    icon: CreditCard,
  },

  device: {
    label: "Device",
    shortLabel: "DEVICE",
    description: "Device identity and behavioural context",
    icon: Smartphone,
  },
};

export default function EvidencePanel({
  type,
  status = "pending",
  signal = "Awaiting evidence",
  observations = [],
}: EvidencePanelProps) {
  const config = evidenceConfig[type];
  const Icon = config.icon;

  const statusConfig = {
    active: {
      label: "SIGNAL DETECTED",
      icon: <CheckCircle2 size={13} />,
      className: "text-[#b42318]",
    },

    pending: {
      label: "AWAITING DATA",
      icon: <CircleDashed size={13} />,
      className: "text-gray-400",
    },

    clear: {
      label: "NO SIGNAL",
      icon: <CheckCircle2 size={13} />,
      className: "text-[#027a48]",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <article className="border border-[#dfe2e6] bg-white">

      {/* Panel header */}
      <div className="flex items-start justify-between border-b border-[#e5e7eb] px-5 py-4">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 items-center justify-center border border-[#dfe2e6] bg-[#fafafa] text-gray-600">
            <Icon size={17} strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#17191d]">
              {config.label}
            </p>

            <p className="mt-1 text-[11px] text-gray-500">
              {config.description}
            </p>
          </div>

        </div>

        <span className="font-mono text-[9px] tracking-[0.12em] text-gray-400">
          {config.shortLabel}
        </span>

      </div>


      {/* Signal */}
      <div className="px-5 py-4">

        <div className="flex items-center justify-between">

          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Stream assessment
          </span>

          <div
            className={`flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.08em] ${currentStatus.className}`}
          >
            {currentStatus.icon}
            {currentStatus.label}
          </div>

        </div>


        <div className="mt-3 border-l-2 border-[#dfe2e6] pl-3">
          <p className="text-sm font-medium text-[#17191d]">
            {signal}
          </p>
        </div>


        {/* Observations */}
        {observations.length > 0 && (
          <div className="mt-5">

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Observations
            </p>

            <div className="space-y-2">

              {observations.map((observation, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-xs leading-5 text-gray-600"
                >
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" />

                  <span>{observation}</span>
                </div>
              ))}

            </div>

          </div>
        )}

      </div>


      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#e5e7eb] px-5 py-3">

        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
          Evidence stream
        </span>

        <ChevronRight
          size={14}
          className="text-gray-300"
        />

      </div>

    </article>
  );
}