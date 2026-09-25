"use client";

import { useState, type ReactNode } from "react";

export interface BettingTab {
  key: string;
  label: string;
  content: ReactNode;
}

export function MatchBettingTabs({ tabs }: { tabs: BettingTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveKey(tab.key)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              activeKey === tab.key
                ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                : "border-border text-muted hover:border-accent-cyan hover:text-accent-cyan"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} hidden={tab.key !== activeKey} className="flex flex-col gap-4">
          {tab.content}
        </div>
      ))}
    </div>
  );
}
