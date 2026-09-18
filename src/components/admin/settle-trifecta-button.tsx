"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SettleResponse {
  error?: string;
  settledBetCount?: number;
  refunded?: boolean;
}

export function SettleTrifectaButton({ songId }: { songId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSettle() {
    setIsPending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/songs/${songId}/settle-trifecta`, {
        method: "POST",
      });
      const data = (await res.json()) as SettleResponse;
      if (!res.ok) {
        setResult(data.error ?? "精算に失敗しました");
        return;
      }
      setResult(
        `精算完了（対象ベット数: ${data.settledBetCount}${data.refunded ? "、全額返金" : ""}）`,
      );
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleSettle}
        disabled={isPending}
        className="self-start rounded border border-black px-3 py-1.5 text-sm disabled:opacity-50"
      >
        3連単を精算（登録済みの結果から自動判定）
      </button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </div>
  );
}
