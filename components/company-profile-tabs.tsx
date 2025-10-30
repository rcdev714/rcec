'use client';

import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface CompanyProfileTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
}

export function CompanyProfileTabs({ activeTab, onTabChange, tabs }: CompanyProfileTabsProps) {
  return (
    <div className="border-b border-gray-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-20 shadow-sm shadow-gray-900/5">
      <div className="max-w-6xl mx-auto px-6">
        <nav className="flex gap-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative py-4 px-1 font-normal text-xs transition-colors uppercase tracking-wider",
                "hover:text-gray-900",
                "focus:outline-none focus:text-gray-900",
                activeTab === tab.id
                  ? "text-gray-900"
                  : "text-gray-500"
              )}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-normal",
                    activeTab === tab.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600"
                  )}>
                    {tab.count}
                  </span>
                )}
              </span>
              
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

