"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface GameSchedule {
  game_key: string;
  start_time: string;
}

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function GameScheduleListItem({ schedule }: { schedule: GameSchedule }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [startTime, setStartTime] = useState(
    toDatetimeLocalValue(schedule.start_time),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(
        `/api/admin/game-schedules/${encodeURIComponent(schedule.game_key)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime: new Date(startTime).toISOString(),
          }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました");
        return;
      }
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Game「${schedule.game_key}」の日程を削除しますか？`)) {
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch(
        `/api/admin/game-schedules/${encodeURIComponent(schedule.game_key)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "削除に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (isEditing) {
    return (
      <li className="flex flex-col gap-2 rounded-lg border border-border p-2">
        <div className="flex items-center gap-2">
          <span className="w-16 text-sm font-semibold text-foreground">
            {schedule.game_key}
          </span>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input-base py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary text-xs"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="btn-secondary text-xs"
          >
            キャンセル
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span>
        <span className="font-semibold text-foreground">{schedule.game_key}</span>{" "}
        — {new Date(schedule.start_time).toLocaleString("ja-JP")}
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-accent-cyan underline"
        >
          編集
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs text-danger underline disabled:opacity-50"
        >
          削除
        </button>
      </span>
    </li>
  );
}
