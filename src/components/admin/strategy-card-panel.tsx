"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [targetSongId, setTargetSongId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const usedTeamIdsInThisMatch = new Set(usages.map((u) => u.teamId));

  async function handleRecord(teamId: string, roundLabel: string) {
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
      setTargetSongId("");
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

      <div className="mb-4 flex flex-col gap-3">
        {teams.map((team) => {
          const remaining = Math.max(team.limit - team.usedCount, 0);
          const alreadyUsedThisMatch = usedTeamIdsInThisMatch.has(team.id);
          const disabled = isPending || remaining <= 0 || alreadyUsedThisMatch;
          return (
            <div key={team.id} className="rounded-lg border border-border p-3">
              <p className="mb-2 text-sm font-semibold text-foreground">
                [{team.side.toUpperCase()}] {team.name}：残り{remaining}/{team.limit}枚
                {alreadyUsedThisMatch && (
                  <span className="ml-2 text-xs font-normal text-muted">
                    （この試合では使用済み）
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {roundLabels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleRecord(team.id, label)}
                    className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {label}で使用
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border p-3">
        <p className="text-xs text-muted">
          上のボタンを押すと即座に使用記録が登録されます。曲・メモを添えたい場合は先に入力してからボタンを押してください。
        </p>
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
      </div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

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
