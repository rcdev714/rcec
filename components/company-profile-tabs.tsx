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
    <div className="border-b border-gray-200 bg-white sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6">
        <nav className="flex gap-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative py-4 px-1 font-medium text-sm transition-colors",
                "hover:text-gray-900",
                "focus:outline-none focus:text-gray-900",
                activeTab === tab.id
                  ? "text-gray-900"
                  : "text-gray-600"
              )}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    activeTab === tab.id
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-600"
                  )}>
                    {tab.count}
                  </span>
                )}
              </span>
              
              {/* Active indicator - like Twitter/Instagram */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

