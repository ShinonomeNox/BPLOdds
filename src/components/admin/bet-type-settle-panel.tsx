"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface BetOption {
  id: string;
  label: string;
  sub_label?: string | null;
  option_key: string;
  odds?: number | null;
  poolAmount?: number;
}

interface BetType {
  id: string;
  label: string;
  type_key: string;
  options: BetOption[];
}

interface SettleResponse {
  error?: string;
  settledBetCount?: number;
  refunded?: boolean;
}

export function BetTypeSettlePanel({ betType }: { betType: BetType }) {
  const router = useRouter();
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function toggleOption(id: string) {
    setSelectedOptionIds((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id],
    );
  }

  async function handleSettle() {
    if (selectedOptionIds.length === 0) {
      setResult("正解の選択肢を1つ以上選んでください");
      return;
    }
    setIsPending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/bet-types/${betType.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winningOptionIds: selectedOptionIds }),
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
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <p className="font-medium text-sm">{betType.label}</p>
      <div className="flex flex-col gap-1 text-sm">
        {betType.options.map((option) => (
          <label key={option.id} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedOptionIds.includes(option.id)}
                onChange={() => toggleOption(option.id)}
              />
              {option.label}
              {option.sub_label && (
                <span className="text-xs text-muted">（{option.sub_label}）</span>
              )}
            </span>
            {option.odds !== undefined && (
              <span className="text-xs font-bold text-accent-cyan">
                {option.odds !== null ? `×${option.odds.toFixed(1)}` : "未賭け"}
                {option.poolAmount ? ` (${option.poolAmount}EC)` : ""}
              </span>
            )}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSettle}
        disabled={isPending}
        className="self-start btn-secondary text-sm"
      >
        正解を確定して精算
      </button>
      {result && <p className="text-sm text-muted">{result}</p>}
    </div>
  );
}
