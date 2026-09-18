"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface Participant {
  id: string;
  playerName: string;
}

interface ExistingResult {
  participant_id: string;
  rank: number | null;
  raw_score: number | null;
}

interface SubmitResultsResponse {
  error?: string;
}

export function SubmitResultsForm({
  songId,
  participants,
  existingResults,
}: {
  songId: string;
  participants: Participant[];
  existingResults: ExistingResult[];
}) {
  const router = useRouter();
  const existingByParticipant = new Map(
    existingResults.map((r) => [r.participant_id, r]),
  );
  const [ranks, setRanks] = useState<Record<string, string>>(
    Object.fromEntries(
      participants.map((p) => [
        p.id,
        existingByParticipant.get(p.id)?.rank?.toString() ?? "",
      ]),
    ),
  );
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(
      participants.map((p) => [
        p.id,
        existingByParticipant.get(p.id)?.raw_score?.toString() ?? "",
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const results = participants.map((p) => ({
      participantId: p.id,
      rank: ranks[p.id] ? Number(ranks[p.id]) : null,
      rawScore: scores[p.id] ? Number(scores[p.id]) : null,
    }));

    if (results.some((r) => r.rank === null)) {
      setError("全員分の順位を入力してください");
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/songs/${songId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      const data = (await res.json()) as SubmitResultsResponse;
      if (!res.ok) {
        setError(data.error ?? "結果の登録に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (participants.length === 0) {
    return <p className="text-xs text-gray-400">出場選手が未登録です</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-sm font-medium">結果入力</p>
      {participants.map((p) => (
        <div key={p.id} className="flex items-center gap-2 text-sm">
          <span className="w-32">{p.playerName}</span>
          <label className="flex items-center gap-1">
            順位
            <input
              type="number"
              min={1}
              className="w-16 rounded border px-2 py-1"
              value={ranks[p.id] ?? ""}
              onChange={(e) =>
                setRanks((prev) => ({ ...prev, [p.id]: e.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-1">
            スコア
            <input
              type="number"
              className="w-24 rounded border px-2 py-1"
              value={scores[p.id] ?? ""}
              onChange={(e) =>
                setScores((prev) => ({ ...prev, [p.id]: e.target.value }))
              }
            />
          </label>
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded border border-black px-3 py-1.5 text-sm disabled:opacity-50"
      >
        結果を登録
      </button>
    </form>
  );
}
