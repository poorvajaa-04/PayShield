"use client";

import {
  ShieldCheck,
  ShieldAlert,
  CircleDashed,
  ArrowRight,
  Lock,
} from "lucide-react";

interface DecisionPanelProps {
  decision?:
    | "allow"
    | "review"
    | "block"
    | "pending"
    | "TRANSACTION_HOLD";
  reason?: string;
  actions?: string[];
}

export default function DecisionPanel({
  decision = "pending",
  reason = "Policy evaluation will begin after the attack state is established.",
  actions = [],
}: DecisionPanelProps) {
  const config = {
    allow: {
      label: "Allow",
      icon: ShieldCheck,
      description: "No intervention required",
      className: "text-[#027a48]",
    },

    review: {
      label: "Review",
      icon: CircleDashed,
      description: "Additional investigation required",
      className: "text-[#9a6700]",
    },

    block: {
      label: "Block",
      icon: ShieldAlert,
      description: "Protective action recommended",
      className: "text-[#b42318]",
    },

    TRANSACTION_HOLD: {
      label: "Transaction Hold",
      icon: ShieldAlert,
      description: "Transaction should be held for investigation",
      className: "text-[#b42318]",
    },

    pending: {
      label: "Pending",
      icon: CircleDashed,
      description: "Awaiting attack-state assessment",
      className: "text-gray-400",
    },
  };

  const current = config[decision];
  const Icon = current.icon;

  return (
    <section className="border border-[#dfe2e6] bg-white">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#e5e7eb] px-5 py-4">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 items-center justify-center border border-[#dfe2e6] bg-[#fafafa] text-gray-600">
            <Lock size={16} strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#17191d]">
              Policy decision
            </p>

            <p className="mt-1 text-[11px] text-gray-500">
              Action determined from the case attack state
            </p>
          </div>

        </div>

        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">
          Policy engine
        </span>

      </div>


      {/* Decision */}
      <div className="grid grid-cols-1 border-b border-[#e5e7eb] md:grid-cols-[1fr_280px]">

        <div className="px-5 py-7">

          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Recommended action
          </p>

          <div
            className={`mt-3 flex items-center gap-3 ${current.className}`}
          >

            <Icon size={25} strokeWidth={1.7} />

            <h3 className="text-3xl font-semibold tracking-tight">
              {current.label}
            </h3>

          </div>

          <p className="mt-2 text-sm text-gray-500">
            {current.description}
          </p>

        </div>


        {/* Reason */}
        <div className="border-t border-[#e5e7eb] px-5 py-7 md:border-l md:border-t-0">

          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Decision basis
          </p>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            {reason}
          </p>

        </div>

      </div>


      {/* Actions */}
      <div className="px-5 py-5">

        <div className="mb-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Policy actions
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Actions associated with the resulting policy decision
          </p>

        </div>


        {actions.length === 0 ? (
          <div className="border border-dashed border-[#d6d9dd] bg-[#fafafa] px-5 py-7 text-center">

            <p className="text-sm font-medium text-gray-500">
              No additional policy actions
            </p>

            <p className="mt-1 text-xs text-gray-400">
              The case engine has determined the required action.
            </p>

          </div>
        ) : (
          <div className="space-y-2">

            {actions.map((action, index) => (
              <div
                key={index}
                className="flex items-center justify-between border border-[#e5e7eb] px-4 py-3"
              >

                <span className="text-xs text-gray-600">
                  {action}
                </span>

                <ArrowRight
                  size={13}
                  className="text-gray-300"
                />

              </div>
            ))}

          </div>
        )}

      </div>


      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#e5e7eb] px-5 py-3">

        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-400">
          Decision layer
        </span>

        <span className="text-[10px] text-gray-400">
          Attack state → Policy
        </span>

      </div>

    </section>
  );
}