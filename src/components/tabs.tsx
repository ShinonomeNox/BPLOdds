"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
  color?: string | null;
}

export function Tabs({
  tabs,
  equalWidth = false,
  activeKey: controlledActiveKey,
  onActiveKeyChange,
}: {
  tabs: TabItem[];
  equalWidth?: boolean;
  activeKey?: string;
  onActiveKeyChange?: (key: string) => void;
}) {
  const [internalActiveKey, setInternalActiveKey] = useState(tabs[0]?.key);
  const activeKey = controlledActiveKey ?? internalActiveKey;

  function selectTab(key: string) {
    if (onActiveKeyChange) {
      onActiveKeyChange(key);
    } else {
      setInternalActiveKey(key);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex gap-2 ${equalWidth ? "" : "overflow-x-auto pb-1"}`}>
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          const widthClass = equalWidth ? "flex-1" : "shrink-0";
          if (tab.color) {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
                className={`${widthClass} rounded-full border px-4 py-2 text-sm font-semibold transition-colors`}
                style={
                  isActive
                    ? {
                        backgroundColor: tab.color,
                        borderColor: tab.color,
                        color: "#fff",
                      }
                    : { borderColor: tab.color, color: tab.color }
                }
              >
                {tab.label}
              </button>
            );
          }
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={`${widthClass} rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                  : "border-border text-muted hover:border-accent-cyan hover:text-accent-cyan"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} hidden={tab.key !== activeKey} className="flex flex-col gap-4">
          {tab.content}
        </div>
      ))}
    </div>
  );
}
