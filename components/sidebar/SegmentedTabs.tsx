import { type ReactNode } from "react";

type Tab = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type SegmentedTabsProps = {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
};

export default function SegmentedTabs({
  tabs,
  activeTab,
  onChange,
}: SegmentedTabsProps) {
  return (
    <div className="flex p-0.5 space-x-1 rounded-lg bg-[#0F1115] border border-white/[0.06]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 text-xs font-semibold transition-all duration-150 ${
              isActive
                ? "bg-[#1A1F29] text-[#E6E8EB] shadow-sm ring-1 ring-white/[0.06]"
                : "text-[#9CA3AF] hover:text-[#E6E8EB] hover:bg-white/[0.02]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
