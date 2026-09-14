"use client";

import {
  Activity,
  GitBranch,
  Network,
  Settings,
  Shield,
  Clock3,
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-[#dfe2e6] bg-white">
      
      {/* Brand */}
      <div className="flex h-20 items-center border-b border-[#dfe2e6] px-6">
        <div className="mr-3 flex h-9 w-9 items-center justify-center bg-[#17191d] text-white">
          <Shield size={18} strokeWidth={2} />
        </div>

        <div>
          <div className="text-[15px] font-semibold tracking-tight">
            PayShield
          </div>

          <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-gray-400">
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

      {/* Bottom section */}
      <div className="border-t border-[#dfe2e6] p-3">

        <NavItem
          icon={<Settings size={16} />}
          label="Settings"
        />

        {/* Engine status */}
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
  );
}


/* Navigation item */

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