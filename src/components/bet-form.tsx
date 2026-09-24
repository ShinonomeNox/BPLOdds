"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface PlaceBetResponse {
  error?: string;
  remainingCoins?: number;
}

export function BetForm({
  betOptionId,
  label,
  isLoggedIn,
}: {
  betOptionId: string;
  label: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleBet() {
    setIsPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betOptionId, amount }),
      });
      const data = (await res.json()) as PlaceBetResponse;
      if (!res.ok) {
        setMessage(data.error ?? "エールの送信に失敗しました");
        return;
      }
      setMessage(`エールを送りました！残りEC: ${data.remainingCoins}`);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-b-0">
        <span className="text-foreground">{label}</span>
        <Link href="/login" className="text-xs text-accent-cyan underline">
          ログインしてエールを送る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 border-b border-border py-2 last:border-b-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="flex-1 text-sm text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input-base w-20 py-1 text-sm"
          />
          <span className="text-xs text-muted">EC</span>
          <button
            type="button"
            onClick={handleBet}
            disabled={isPending}
            className="btn-secondary px-3 py-1 text-xs"
          >
            エールを送る
          </button>
        </div>
      </div>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
