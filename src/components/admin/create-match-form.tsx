"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

interface Team {
  id: string;
  name: string;
  game_title: string;
}

export function CreateMatchForm({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [gameTitle, setGameTitle] = useState<GameTitle>("iidx");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameTitle,
          teamAId,
          teamBId,
          startTime: new Date(startTime).toISOString(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "試合の作成に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">機種</span>
        <select
          value={gameTitle}
          onChange={(e) => setGameTitle(e.target.value as GameTitle)}
          className="input-base"
        >
          {GAME_TITLES.map((title) => (
            <option key={title} value={title}>
              {title.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">Aチーム</span>
        <select
          value={teamAId}
          onChange={(e) => setTeamAId(e.target.value)}
          required
          className="input-base"
        >
          <option value="">選択してください</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}（{team.game_title}）
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">Bチーム</span>
        <select
          value={teamBId}
          onChange={(e) => setTeamBId(e.target.value)}
          required
          className="input-base"
        >
          <option value="">選択してください</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}（{team.game_title}）
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">開始日時</span>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          className="input-base"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={isPending} className="btn-primary">
        試合を作成
      </button>
    </form>
  );
}
