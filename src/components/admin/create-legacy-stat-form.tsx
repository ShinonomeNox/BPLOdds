"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { LegacyStatCategoryType } from "@/types/database";

interface Player {
  id: string;
  name: string;
}

const CATEGORY_TYPES: LegacyStatCategoryType[] = ["theme", "level"];

export function CreateLegacyStatForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [season, setSeason] = useState("season5");
  const [categoryType, setCategoryType] =
    useState<LegacyStatCategoryType>("theme");
  const [categoryValue, setCategoryValue] = useState("");
  const [wins, setWins] = useState(0);
  const [plays, setPlays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/legacy-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          season,
          categoryType,
          categoryValue,
          wins,
          plays,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      setCategoryValue("");
      setWins(0);
      setPlays(0);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1">
        <span className="text-sm">選手</span>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          required
          className="rounded border px-3 py-2"
        >
          <option value="">選択してください</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">シーズン（例: season5）</span>
        <input
          type="text"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">区分</span>
        <select
          value={categoryType}
          onChange={(e) =>
            setCategoryType(e.target.value as LegacyStatCategoryType)
          }
          className="rounded border px-3 py-2"
        >
          {CATEGORY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === "theme" ? "テーマ" : "レベル"}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">区分値（テーマ名 or レベル値）</span>
        <input
          type="text"
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">勝利数</span>
          <input
            type="number"
            min={0}
            value={wins}
            onChange={(e) => setWins(Number(e.target.value))}
            className="w-24 rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">プレイ数</span>
          <input
            type="number"
            min={0}
            value={plays}
            onChange={(e) => setPlays(Number(e.target.value))}
            className="w-24 rounded border px-3 py-2"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        登録
      </button>
    </form>
  );
}
