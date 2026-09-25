"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AmountInput } from "@/components/amount-input";
import { BetOptionRow } from "@/components/bet-option-row";
import { StatusBadge } from "@/components/status-badge";

export interface BetOptionViewModel {
  id: string;
  label: string;
  odds: number | null;
  myBetAmount: number | null;
}

interface PlaceBetResponse {
  error?: string;
  remainingCoins?: number;
}

export function BetTypePanel({
  betTypeId,
  betTypeLabel,
  options,
  isLoggedIn,
  isClosed,
}: {
  betTypeId: string;
  betTypeLabel: string;
  options: BetOptionViewModel[];
  isLoggedIn: boolean;
  isClosed: boolean;
}) {
  const router = useRouter();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [amount, setAmount] = useState(10);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedOptionId) return;
    setIsPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betOptionId: selectedOptionId, amount }),
      });
      const data = (await res.json()) as PlaceBetResponse;
      if (!res.ok) {
        setMessage(data.error ?? "エールの送信に失敗しました");
        return;
      }
      setMessage(`エールを送りました！残りEC: ${data.remainingCoins}`);
      setSelectedOptionId(null);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  const disabled = !isLoggedIn || isClosed;

  return (
    <div className="card-surface flex flex-col gap-2 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">{betTypeLabel}</p>
        {isClosed && <StatusBadge status="settled" />}
      </div>

      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <BetOptionRow
            key={option.id}
            optionId={option.id}
            label={option.label}
            odds={option.odds}
            myBetAmount={option.myBetAmount}
            groupName={betTypeId}
            selected={selectedOptionId === option.id}
            disabled={disabled}
            onSelect={() => setSelectedOptionId(option.id)}
          />
        ))}
      </div>

      {!isLoggedIn && (
        <Link href="/login" className="text-sm text-accent-cyan underline">
          ログインしてエールを送る
        </Link>
      )}

      {isLoggedIn && !isClosed && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <AmountInput value={amount} onChange={setAmount} />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !selectedOptionId}
            className="btn-primary text-sm"
          >
            エールを送る
          </button>
        </div>
      )}
      <p className="text-xs text-muted">※最少10ptから</p>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
