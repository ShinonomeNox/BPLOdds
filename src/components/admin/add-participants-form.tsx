"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { TeamSide } from "@/types/database";

interface Player {
  id: string;
  name: string;
}

export function AddParticipantsForm({
  matchId,
  players,
  registeredPlayerIds,
}: {
  matchId: string;
  players: Player[];
  registeredPlayerIds: string[];
}) {
  const router = useRouter();
  const registeredSet = new Set(registeredPlayerIds);
  const availablePlayers = players.filter((p) => !registeredSet.has(p.id));
  const [selections, setSelections] = useState<Record<string, TeamSide | "">>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function setSide(playerId: string, side: TeamSide) {
    setSelections((prev) => ({ ...prev, [playerId]: side }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const participants = Object.entries(selections)
      .filter(([, side]) => side !== "")
      .map(([playerId, side]) => ({ playerId, teamSide: side }));

    if (participants.length === 0) {
      setError("選手を1人以上選択してください");
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      setSelections({});
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (availablePlayers.length === 0) {
    return <p className="text-xs text-gray-400">追加できる選手がいません</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-sm font-medium">出場選手を追加</p>
      {availablePlayers.map((player) => (
        <div key={player.id} className="flex items-center gap-3 text-sm">
          <span className="w-32">{player.name}</span>
          {(["a", "b"] as const).map((side) => (
            <label key={side} className="flex items-center gap-1">
              <input
                type="radio"
                name={`side-${player.id}`}
                checked={selections[player.id] === side}
                onChange={() => setSide(player.id, side)}
              />
              {side.toUpperCase()}
            </label>
          ))}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded border border-black px-3 py-1.5 text-sm disabled:opacity-50"
      >
        追加
      </button>
    </form>
  );
}
