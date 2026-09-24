"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

interface Team {
  id: string;
  name: string;
  game_title: GameTitle;
  color: string | null;
}

export function TeamListItem({ team }: { team: Team }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [gameTitle, setGameTitle] = useState<GameTitle>(team.game_title);
  const [color, setColor] = useState(team.color ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gameTitle, color: color || null }),
      });
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
    if (!confirm(`「${team.name}」を削除しますか？`)) {
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: "DELETE",
      });
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
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base py-1 text-sm"
          />
          <select
            value={gameTitle}
            onChange={(e) => setGameTitle(e.target.value as GameTitle)}
            className="input-base py-1 text-sm"
          >
            {GAME_TITLES.map((title) => (
              <option key={title} value={title}>
                {title.toUpperCase()}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#RRGGBB"
            className="input-base w-28 py-1 text-sm"
          />
          {color && (
            <span
              className="h-6 w-6 rounded-full border border-border"
              style={{ backgroundColor: color }}
            />
          )}
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
      <span className="flex items-center gap-2">
        {team.color && (
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: team.color }}
          />
        )}
        {team.name}（{team.game_title.toUpperCase()}）
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
