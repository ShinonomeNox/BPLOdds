"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AmountInput } from "@/components/amount-input";

const MIN_DONATE_AMOUNT = 100;

interface DonateTeamResponse {
  error?: string;
  remainingCoins?: number;
  teamTotalPoints?: number;
}

export function DonateTeamForm({
  teamId,
  isLoggedIn,
}: {
  teamId: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(MIN_DONATE_AMOUNT);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleDonate() {
    setIsPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/yell/donate-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, amount }),
      });
      const data = (await res.json()) as DonateTeamResponse;
      if (!res.ok) {
        setMessage(data.error ?? "エールの送信に失敗しました");
        return;
      }
      setMessage(`エールを送りました！（残りEC: ${data.remainingCoins}）`);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <Link href="/login" className="text-sm text-accent-cyan underline">
        ログインしてエールを送る
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <AmountInput value={amount} onChange={setAmount} min={MIN_DONATE_AMOUNT} />
        <button
          type="button"
          onClick={handleDonate}
          disabled={isPending || amount < MIN_DONATE_AMOUNT}
          className="btn-primary text-sm"
        >
          エールを送る
        </button>
      </div>
      <p className="text-xs text-muted">※最少{MIN_DONATE_AMOUNT}ptから</p>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
