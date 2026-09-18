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
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <Link href="/login" className="text-xs underline">
          ログインしてエールを送る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm">
        <span className="flex-1">{label}</span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-20 rounded border px-2 py-1"
        />
        <span className="text-xs text-gray-400">EC</span>
        <button
          type="button"
          onClick={handleBet}
          disabled={isPending}
          className="rounded border border-black px-2 py-1 text-xs disabled:opacity-50"
        >
          エールを送る
        </button>
      </div>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}
