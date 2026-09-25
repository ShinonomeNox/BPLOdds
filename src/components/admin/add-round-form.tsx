"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { RoundFormat } from "@/types/database";
import { ROUND_FORMAT_LABEL_JA } from "@/lib/betting/match-format";

const ROUND_NUMBERS = [1, 2, 3, 4] as const;
const ROUND_FORMATS: RoundFormat[] = ["single", "tag", "megamix"];

export function AddRoundForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [roundFormat, setRoundFormat] = useState<RoundFormat>("single");
  const [theme, setTheme] = useState("");
  const [levelRange, setLevelRange] = useState("");
  const [playerAName, setPlayerAName] = useState("");
  const [playerBName, setPlayerBName] = useState("");
  const [playerA2Name, setPlayerA2Name] = useState("");
  const [playerB2Name, setPlayerB2Name] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundNumber,
          roundFormat,
          theme: theme || null,
          levelRange: levelRange || null,
          playerAName,
          playerBName,
          playerA2Name: roundFormat === "tag" ? playerA2Name : null,
          playerB2Name: roundFormat === "tag" ? playerB2Name : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "ラウンドの登録に失敗しました");
        return;
      }
      setTheme("");
      setLevelRange("");
      setPlayerAName("");
      setPlayerBName("");
      setPlayerA2Name("");
      setPlayerB2Name("");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-border p-3"
    >
      <p className="text-sm font-medium text-foreground">マッチを追加</p>
      <label className="flex items-center gap-2 text-sm">
        ラウンド
        <select
          value={roundNumber}
          onChange={(e) => setRoundNumber(Number(e.target.value))}
          className="input-base py-1"
        >
          {ROUND_NUMBERS.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : "4th"}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        試合形式
        <select
          value={roundFormat}
          onChange={(e) => setRoundFormat(e.target.value as RoundFormat)}
          className="input-base py-1"
        >
          {ROUND_FORMATS.map((format) => (
            <option key={format} value={format}>
              {ROUND_FORMAT_LABEL_JA[format]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        テーマ（任意）
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="input-base py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        レベル帯（任意）
        <input
          type="text"
          value={levelRange}
          onChange={(e) => setLevelRange(e.target.value)}
          placeholder="例: 13-14"
          className="input-base py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        選手A
        <input
          type="text"
          value={playerAName}
          onChange={(e) => setPlayerAName(e.target.value)}
          required
          className="input-base py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        選手B
        <input
          type="text"
          value={playerBName}
          onChange={(e) => setPlayerBName(e.target.value)}
          required
          className="input-base py-1"
        />
      </label>
      {roundFormat === "tag" && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            選手A2
            <input
              type="text"
              value={playerA2Name}
              onChange={(e) => setPlayerA2Name(e.target.value)}
              required
              className="input-base py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            選手B2
            <input
              type="text"
              value={playerB2Name}
              onChange={(e) => setPlayerB2Name(e.target.value)}
              required
              className="input-base py-1"
            />
          </label>
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start btn-secondary text-sm"
      >
        マッチを追加
      </button>
    </form>
  );
}
