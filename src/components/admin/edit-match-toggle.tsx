"use client";

import { useState } from "react";
import { EditMatchForm } from "@/components/admin/edit-match-form";

interface Team {
  id: string;
  name: string;
  game_title: string;
}

export function EditMatchToggle({
  matchId,
  teams,
  initialTeamAId,
  initialTeamBId,
  initialStartTime,
}: {
  matchId: string;
  teams: Team[];
  initialTeamAId: string;
  initialTeamBId: string;
  initialStartTime: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="btn-secondary text-sm"
      >
        {isOpen ? "編集を閉じる" : "編集"}
      </button>
      {isOpen && (
        <div className="w-full rounded-lg border border-border p-3">
          <EditMatchForm
            matchId={matchId}
            teams={teams}
            initialTeamAId={initialTeamAId}
            initialTeamBId={initialTeamBId}
            initialStartTime={initialStartTime}
          />
        </div>
      )}
    </div>
  );
}
