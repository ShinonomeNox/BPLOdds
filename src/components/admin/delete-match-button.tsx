"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(force: boolean) {
    if (!confirm("この試合を削除しますか？関連するマッチ・曲・ベット・賭けも削除されます。")) {
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/matches/${matchId}${force ? "?force=true" : ""}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 409 && !force) {
          if (confirm(`${data.error}\n強制削除しますか？`)) {
            await handleDelete(true);
          }
          return;
        }
        setError(data.error ?? "削除に失敗しました");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => handleDelete(false)}
        disabled={isPending}
        className="btn-secondary btn-danger text-sm"
      >
        試合を削除
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
