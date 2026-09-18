"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

export function CreateSongForm() {
  const router = useRouter();
  const [gameTitle, setGameTitle] = useState<GameTitle>("iidx");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [level, setLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameTitle,
          name,
          theme: theme || null,
          level: level ? Number(level) : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "課題曲の作成に失敗しました");
        return;
      }
      setName("");
      setTheme("");
      setLevel("");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1">
        <span className="text-sm">機種</span>
        <select
          value={gameTitle}
          onChange={(e) => setGameTitle(e.target.value as GameTitle)}
          className="rounded border px-3 py-2"
        >
          {GAME_TITLES.map((title) => (
            <option key={title} value={title}>
              {title.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">曲名</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">テーマ区分（任意）</span>
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">難易度レベル（任意）</span>
        <input
          type="number"
          step="0.1"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        課題曲を作成
      </button>
    </form>
  );
}
