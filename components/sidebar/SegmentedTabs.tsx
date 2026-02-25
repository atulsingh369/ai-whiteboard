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
    <div className="flex p-0.5 space-x-1 rounded-lg bg-surface-app border border-border-subtle">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 text-xs font-semibold transition-all duration-150 ${
              isActive
                ? "bg-surface-2 text-txt-primary shadow-sm"
                : "text-txt-secondary hover:text-txt-primary hover:bg-surface-2/50"
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
