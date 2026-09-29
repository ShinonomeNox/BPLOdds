"use client";

import { useState } from "react";
import { Tabs, type TabItem } from "@/components/tabs";
import { PlayerMatchupHeader } from "@/components/player-matchup-header";

export interface MatchupRow {
  tabKey: string;
  roundLabel: string;
  aName: string;
  aName2: string | null;
  aColor: string | null;
  bName: string;
  bName2: string | null;
  bColor: string | null;
}

export function MatchPageBody({
  matchupRows,
  tabs,
  initialActiveKey,
}: {
  matchupRows: MatchupRow[];
  tabs: TabItem[];
  initialActiveKey?: string;
}) {
  const hasInitialKey =
    initialActiveKey && tabs.some((tab) => tab.key === initialActiveKey);
  const [activeKey, setActiveKey] = useState(
    hasInitialKey ? initialActiveKey : tabs[0]?.key,
  );

  return (
    <>
      {matchupRows.length > 0 && (
        <div className="card-surface mb-6 flex flex-col gap-2 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">対戦カード</p>
          {matchupRows.map((row) => (
            <PlayerMatchupHeader
              key={row.tabKey}
              aName={row.aName}
              aName2={row.aName2}
              aColor={row.aColor}
              bName={row.bName}
              bName2={row.bName2}
              bColor={row.bColor}
              centerLabel={row.roundLabel}
              onClick={() => setActiveKey(row.tabKey)}
            />
          ))}
        </div>
      )}
      <Tabs tabs={tabs} activeKey={activeKey} onActiveKeyChange={setActiveKey} />
    </>
  );
}
