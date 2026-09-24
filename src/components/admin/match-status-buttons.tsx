"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MatchStatus } from "@/types/database";

const STATUSES: { value: MatchStatus; label: string }[] = [
  { value: "scheduled", label: "選曲発表（受付中）" },
  { value: "live", label: "演奏開始（締切）" },
  { value: "settled", label: "終了" },
];

export function MatchStatusButtons({
  matchId,
  currentStatus,
}: {
  matchId: string;
  currentStatus: MatchStatus;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: MatchStatus) {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={isPending || currentStatus === value}
            onClick={() => updateStatus(value)}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-40 ${
              currentStatus === value
                ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                : "border-border text-foreground hover:border-accent-cyan"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
