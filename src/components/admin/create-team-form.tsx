"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gameTitle, setGameTitle] = useState<GameTitle>("iidx");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gameTitle }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "チームの作成に失敗しました");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">チーム名</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input-base"
        />
      </label>
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start btn-primary text-sm"
      >
        チームを作成
      </button>
    </form>
  );
}
