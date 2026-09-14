"use client";

import { Bell, Play } from "lucide-react";

interface HeaderProps {
  onRun: () => void;
  loading: boolean;
}

export default function Header({
  onRun,
  loading,
}: HeaderProps) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-[#dfe2e6] bg-white px-8">

      {/* Case information */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            Investigation
          </span>

          <span className="text-gray-300">
            /
          </span>

          <span className="font-mono text-xs text-gray-500">
            CASE-2026-0142
          </span>
        </div>

        <p className="mt-1 text-xs text-gray-400">
          Cross-stage evidence analysis
        </p>
      </div>


      {/* Actions */}
      <div className="flex items-center gap-3">

        {/* Notification */}
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center border border-[#dfe2e6] bg-white text-gray-500 transition hover:bg-gray-50"
        >
          <Bell size={16} />
        </button>


        {/* Run analysis */}
        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="flex items-center gap-2 bg-[#17191d] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#2a2d32] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={14} />

          {loading ? "Analyzing..." : "Run analysis"}
        </button>

      </div>
    </header>
  );
}