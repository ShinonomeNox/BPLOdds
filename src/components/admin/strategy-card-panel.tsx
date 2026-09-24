"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { STRATEGY_CARD_ROUND_LABELS } from "@/lib/betting/strategy-cards";
import type { GameTitle } from "@/types/database";

interface TeamInfo {
  id: string;
  name: string;
  side: "a" | "b";
  usedCount: number;
  limit: number;
}

interface SongOption {
  id: string;
  label: string;
}

interface UsageItem {
  id: string;
  teamId: string;
  teamName: string;
  roundLabel: string;
  targetSongLabel: string | null;
  note: string | null;
}

export function StrategyCardPanel({
  matchId,
  gameTitle,
  teams,
  songs,
  usages,
}: {
  matchId: string;
  gameTitle: GameTitle;
  teams: TeamInfo[];
  songs: SongOption[];
  usages: UsageItem[];
}) {
  const router = useRouter();
  const roundLabels = STRATEGY_CARD_ROUND_LABELS[gameTitle];
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [roundLabel, setRoundLabel] = useState(roundLabels[0] ?? "");
  const [targetSongId, setTargetSongId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/strategy-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          roundLabel,
          targetSongId: targetSongId || null,
          note: note || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "使用記録の登録に失敗しました");
        return;
      }
      setNote("");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete(usageId: string) {
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/strategy-cards/${usageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="card-surface p-5 sm:p-6">
      <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
        ストラテジーカード
      </h2>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {teams.map((team) => (
          <span
            key={team.id}
            className="rounded-lg border border-border px-3 py-1.5 text-foreground"
          >
            [{team.side.toUpperCase()}] {team.name}：残り
            {Math.max(team.limit - team.usedCount, 0)}/{team.limit}枚
          </span>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-4 flex flex-col gap-2 rounded-lg border border-border p-3"
      >
        <p className="text-sm font-medium text-foreground">使用を記録</p>
        <label className="flex items-center gap-2 text-sm">
          使用チーム
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="input-base py-1"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                [{team.side.toUpperCase()}] {team.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          ラウンド
          <select
            value={roundLabel}
            onChange={(e) => setRoundLabel(e.target.value)}
            className="input-base py-1"
          >
            {roundLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {songs.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            無効化した曲（任意）
            <select
              value={targetSongId}
              onChange={(e) => setTargetSongId(e.target.value)}
              className="input-base py-1"
            >
              <option value="">（指定しない）</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          メモ（任意）
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-base py-1"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={isPending || !teamId || !roundLabel}
          className="self-start btn-secondary text-sm"
        >
          使用を記録
        </button>
      </form>

      <ul className="flex flex-col gap-1 text-sm">
        {usages.map((usage) => (
          <li
            key={usage.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <span className="text-foreground">
              {usage.teamName}（{usage.roundLabel}）
              {usage.targetSongLabel && ` — ${usage.targetSongLabel}`}
              {usage.note && (
                <span className="text-muted"> / {usage.note}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(usage.id)}
              disabled={isPending}
              className="text-xs text-danger underline"
            >
              取り消し
            </button>
          </li>
        ))}
        {usages.length === 0 && (
          <p className="text-sm text-muted">この試合での使用記録はありません</p>
        )}
      </ul>
    </section>
  );
}
