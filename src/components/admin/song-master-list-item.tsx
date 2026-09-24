"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Song {
  id: string;
  game_title: string;
  name: string;
  theme: string | null;
  level: number | null;
}

export function SongMasterListItem({ song }: { song: Song }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(song.name);
  const [theme, setTheme] = useState(song.theme ?? "");
  const [level, setLevel] = useState(song.level?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/song-masters/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          theme: theme || null,
          level: level ? Number(level) : null,
        }),
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
    if (!confirm(`「${song.name}」を削除しますか？`)) {
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/song-masters/${song.id}`, {
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
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="テーマ"
            className="input-base py-1 text-sm"
          />
          <input
            type="number"
            step="0.1"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="レベル"
            className="w-20 input-base py-1 text-sm"
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
        [{song.game_title.toUpperCase()}] {song.name}
        {song.theme && ` / ${song.theme}`}
        {song.level !== null && ` / Lv.${song.level}`}
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
