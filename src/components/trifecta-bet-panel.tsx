"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AmountInput } from "@/components/amount-input";

export interface TrifectaParticipantViewModel {
  id: string; // match_participants.id
  name: string;
}

export interface TrifectaOptionViewModel {
  id: string;
  optionKey: string; // "firstId,secondId,thirdId"
  odds: number | null;
  myBetAmount: number | null;
}

interface PlaceBetResponse {
  error?: string;
  remainingCoins?: number;
}

export function TrifectaBetPanel({
  betTypeLabel,
  participants,
  options,
  isLoggedIn,
  isClosed,
}: {
  betTypeId: string;
  betTypeLabel: string;
  participants: TrifectaParticipantViewModel[];
  options: TrifectaOptionViewModel[];
  isLoggedIn: boolean;
  isClosed: boolean;
}) {
  const router = useRouter();
  const optionByKey = new Map(options.map((o) => [o.optionKey, o]));
  const [firstId, setFirstId] = useState<string | null>(participants[0]?.id ?? null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [amount, setAmount] = useState(10);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const disabled = !isLoggedIn || isClosed;
  const others = participants.filter((p) => p.id !== firstId);

  function handleSelectFirst(id: string) {
    setFirstId(id);
    setSelectedOptionId(null);
  }

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

  return (
    <div className="card-surface flex flex-col gap-3 p-4 sm:p-5">
      <p className="font-semibold text-foreground">{betTypeLabel}</p>

      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleSelectFirst(p.id)}
            className={firstId === p.id ? "btn-primary text-xs" : "btn-secondary text-xs"}
          >
            {p.name}が1着
          </button>
        ))}
      </div>

      {firstId && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-1 text-left text-muted">2着＼3着</th>
                {others.map((c) => (
                  <th key={c.id} className="p-1 text-center text-muted">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {others.map((row) => (
                <tr key={row.id}>
                  <td className="p-1 font-semibold text-foreground">{row.name}</td>
                  {others.map((col) => {
                    if (col.id === row.id) {
                      return (
                        <td key={col.id} className="p-1 text-center text-muted">
                          —
                        </td>
                      );
                    }
                    const option = optionByKey.get(`${firstId},${row.id},${col.id}`);
                    if (!option) {
                      return (
                        <td key={col.id} className="p-1 text-center text-muted">
                          —
                        </td>
                      );
                    }
                    const selected = selectedOptionId === option.id;
                    return (
                      <td key={col.id} className="p-1">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setSelectedOptionId(option.id)}
                          className={`w-full rounded-lg border px-1.5 py-1.5 transition-colors ${
                            selected
                              ? "border-accent-cyan bg-accent-cyan/10"
                              : "border-border hover:border-accent-cyan/50"
                          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <div className="font-bold text-accent-cyan">
                            {option.odds !== null ? `×${option.odds.toFixed(1)}` : "未賭け"}
                          </div>
                          {option.myBetAmount !== null && (
                            <div className="text-[10px] text-accent-purple">
                              賭済{option.myBetAmount}EC
                            </div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
