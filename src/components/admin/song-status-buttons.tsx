"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SongStatus } from "@/types/database";

const STATUSES: { value: SongStatus; label: string }[] = [
  { value: "open", label: "選曲発表（受付中）" },
  { value: "closed", label: "演奏開始（締切）" },
  { value: "settled", label: "終了" },
];

export function SongStatusButtons({
  songId,
  currentStatus,
}: {
  songId: string;
  currentStatus: SongStatus;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: SongStatus) {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/songs/${songId}`, {
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
      <div className="flex gap-2">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={isPending || currentStatus === value}
            onClick={() => updateStatus(value)}
            className="rounded border border-black px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
