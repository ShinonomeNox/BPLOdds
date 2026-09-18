"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const SONG_BET_TYPES = [
  { value: "trifecta", label: "3連単（出場選手4人が必要）" },
  { value: "ddr_pair_rank_diff", label: "順位配点差（DDRタッグ）" },
] as const;

export function AddSongForm({
  matchId,
  participantCount,
}: {
  matchId: string;
  participantCount: number;
}) {
  const router = useRouter();
  const [songNumber, setSongNumber] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (selectedTypes.length === 0) {
      setError("ベット種別を1つ以上選択してください");
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songNumber, betTypes: selectedTypes }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "曲の登録に失敗しました");
        return;
      }
      setSelectedTypes([]);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border p-3">
      <p className="text-sm font-medium">曲を追加</p>
      <label className="flex items-center gap-2 text-sm">
        曲番号
        <input
          type="number"
          min={1}
          value={songNumber}
          onChange={(e) => setSongNumber(Number(e.target.value))}
          className="w-20 rounded border px-2 py-1"
        />
      </label>
      <div className="flex flex-col gap-1 text-sm">
        {SONG_BET_TYPES.map(({ value, label }) => {
          const disabled = value === "trifecta" && participantCount !== 4;
          return (
            <label key={value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTypes.includes(value)}
                disabled={disabled}
                onChange={() => toggleType(value)}
              />
              {label}
              {disabled && (
                <span className="text-xs text-gray-400">
                  （出場選手が4人ではありません）
                </span>
              )}
            </label>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded border border-black px-3 py-1.5 text-sm disabled:opacity-50"
      >
        曲を追加
      </button>
    </form>
  );
}
