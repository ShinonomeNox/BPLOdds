"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [amount, setAmount] = useState(10);
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="input-base w-24"
        />
        <span className="text-xs text-muted">EC</span>
        <button
          type="button"
          onClick={handleDonate}
          disabled={isPending}
          className="btn-primary text-sm"
        >
          エールを送る
        </button>
      </div>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
