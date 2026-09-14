"use client";

import {
  Activity,
  Bell,
  GitBranch,
  Network,
  Settings,
  Shield,
  Clock3,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f4f5f6]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-[#dfe2e6] bg-white">
        {/* Brand */}
        <div className="flex h-20 items-center border-b border-[#dfe2e6] px-6">
          <div className="mr-3 flex h-9 w-9 items-center justify-center bg-[#17191d] text-white">
            <Shield size={18} />
          </div>

          <div>
            <div className="text-[15px] font-semibold tracking-tight">
              PayShield
            </div>

            <div className="text-[10px] uppercase tracking-[0.16em] text-gray-400">
              Fraud Intelligence
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
            Workspace
          </p>

          <NavItem
            icon={<Activity size={16} />}
            label="Overview"
            active
          />

          <NavItem
            icon={<Shield size={16} />}
            label="Investigations"
          />

          <NavItem
            icon={<Network size={16} />}
            label="Entity Graph"
          />

          <NavItem
            icon={<GitBranch size={16} />}
            label="Attack State"
          />

          <NavItem
            icon={<Clock3 size={16} />}
            label="Timeline"
          />
        </nav>

        {/* System status */}
        <div className="border-t border-[#dfe2e6] p-3">
          <NavItem
            icon={<Settings size={16} />}
            label="Settings"
          />

          <div className="mt-3 border border-[#dfe2e6] bg-[#f8f9fa] p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#027a48]" />

              <span className="text-xs font-medium">
                Engine operational
              </span>
            </div>

            <p className="mt-1 text-[10px] text-gray-500">
              Correlation engine ready
            </p>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="ml-64 min-h-screen">
        {/* Header */}
        <header className="flex h-20 items-center justify-between border-b border-[#dfe2e6] bg-white px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                Investigation
              </span>

              <span className="text-gray-300">/</span>

              <span className="font-mono text-xs text-gray-500">
                CASE-2026-0142
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-400">
              Cross-stage evidence analysis
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex h-9 w-9 items-center justify-center border border-[#dfe2e6] bg-white text-gray-500 hover:bg-gray-50">
              <Bell size={16} />
            </button>

            <button className="bg-[#17191d] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#2a2d32]">
              Run analysis
            </button>
          </div>
        </header>

        {/* Dashboard */}
        <div className="mx-auto max-w-[1500px] px-8 py-8">
          <div className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
              Investigation workspace
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Case intelligence
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Review how independent evidence streams combine into
              an attack-state assessment and policy decision.
            </p>
          </div>

          {/* Placeholder dashboard */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <DashboardCard
              label="Case status"
              value="Under investigation"
              detail="4 evidence streams"
            />

            <DashboardCard
              label="Correlation"
              value="Awaiting analysis"
              detail="Cross-stage signals"
            />

            <DashboardCard
              label="Decision"
              value="Pending"
              detail="Policy engine"
            />
          </div>

          <div className="mt-5 border border-dashed border-[#cfd3d8] bg-white p-12 text-center">
            <Shield
              size={28}
              className="mx-auto text-gray-300"
            />

            <h2 className="mt-4 text-sm font-semibold">
              Investigation workspace
            </h2>

            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-500">
              Evidence, correlation findings, entity relationships,
              attack progression, and the final policy decision will
              appear here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`mb-1 flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-[#17191d] text-white"
          : "text-gray-600 hover:bg-[#f3f4f6]"
      }`}
    >
      {icon}

      <span>{label}</span>
    </button>
  );
}

function DashboardCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border border-[#dfe2e6] bg-white p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
        {label}
      </p>

      <p className="mt-3 text-xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {detail}
      </p>
    </div>
  );
}