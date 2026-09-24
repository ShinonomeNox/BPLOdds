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
        <span className="text-sm text-muted">選手</span>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          required
          className="input-base"
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
        <span className="text-sm text-muted">シーズン（例: season5）</span>
        <input
          type="text"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          required
          className="input-base"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">区分</span>
        <select
          value={categoryType}
          onChange={(e) =>
            setCategoryType(e.target.value as LegacyStatCategoryType)
          }
          className="input-base"
        >
          {CATEGORY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === "theme" ? "テーマ" : "レベル"}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">区分値（テーマ名 or レベル値）</span>
        <input
          type="text"
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value)}
          required
          className="input-base"
        />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">勝利数</span>
          <input
            type="number"
            min={0}
            value={wins}
            onChange={(e) => setWins(Number(e.target.value))}
            className="w-24 input-base"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">プレイ数</span>
          <input
            type="number"
            min={0}
            value={plays}
            onChange={(e) => setPlays(Number(e.target.value))}
            className="w-24 input-base"
          />
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start btn-primary text-sm"
      >
        登録
      </button>
    </form>
  );
}
