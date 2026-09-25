"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface Team {
  id: string;
  name: string;
  game_title: string;
}

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditMatchForm({
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
  const router = useRouter();
  const [teamAId, setTeamAId] = useState(initialTeamAId);
  const [teamBId, setTeamBId] = useState(initialTeamBId);
  const [startTime, setStartTime] = useState(
    toDatetimeLocalValue(initialStartTime),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAId,
          teamBId,
          startTime: new Date(startTime).toISOString(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        Aチーム
        <select
          value={teamAId}
          onChange={(e) => setTeamAId(e.target.value)}
          className="input-base py-1"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}（{team.game_title}）
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        Bチーム
        <select
          value={teamBId}
          onChange={(e) => setTeamBId(e.target.value)}
          className="input-base py-1"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}（{team.game_title}）
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        開始日時
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="input-base py-1"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start btn-secondary text-sm"
      >
        更新
      </button>
    </form>
  );
}
