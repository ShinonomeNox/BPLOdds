"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AmountInput } from "@/components/amount-input";

export interface TrifectaParticipantViewModel {
  id: string; // match_participants.id
  name: string;
  teamColor: string | null;
}

export interface TrifectaOptionViewModel {
  id: string;
  optionKey: string; // "firstId,secondId,thirdId"
  odds: number | null;
  myBetAmount: number | null;
  isWinner?: boolean;
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
  isSettled = false,
}: {
  betTypeId: string;
  betTypeLabel: string;
  participants: TrifectaParticipantViewModel[];
  options: TrifectaOptionViewModel[];
  isLoggedIn: boolean;
  isClosed: boolean;
  isSettled?: boolean;
}) {
  const router = useRouter();
  const optionByKey = new Map(options.map((o) => [o.optionKey, o]));
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const winner = options.find((o) => o.isWinner);
  const [firstId, setFirstId] = useState<string | null>(
    winner ? winner.optionKey.split(",")[0] : (participants[0]?.id ?? null),
  );
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

      {isSettled && winner && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm font-bold text-success">
          結果:{" "}
          {winner.optionKey
            .split(",")
            .map((id) => nameById.get(id) ?? "?")
            .join(" → ")}
          {winner.odds !== null && `（確定×${winner.odds.toFixed(1)}）`}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {participants.map((p) => {
          const selected = firstId === p.id;
          if (p.teamColor) {
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectFirst(p.id)}
                className="rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: p.teamColor,
                  borderColor: selected ? "#ffffff" : p.teamColor,
                  color: "#ffffff",
                }}
              >
                {p.name}が1着
              </button>
            );
          }
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectFirst(p.id)}
              className={selected ? "btn-primary text-xs" : "btn-secondary text-xs"}
            >
              {p.name}が1着
            </button>
          );
        })}
      </div>

      {firstId && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-0.5 text-left text-muted">2着＼3着</th>
                {others.map((c) => (
                  <th
                    key={c.id}
                    className="p-0.5 text-center font-semibold"
                    style={c.teamColor ? { color: c.teamColor } : undefined}
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {others.map((row) => (
                <tr key={row.id}>
                  <td
                    className="p-0.5 font-semibold"
                    style={row.teamColor ? { color: row.teamColor } : undefined}
                  >
                    {row.name}
                  </td>
                  {others.map((col) => {
                    if (col.id === row.id) {
                      return (
                        <td key={col.id} className="p-0.5 text-center text-muted">
                          —
                        </td>
                      );
                    }
                    const option = optionByKey.get(`${firstId},${row.id},${col.id}`);
                    if (!option) {
                      return (
                        <td key={col.id} className="p-0.5 text-center text-muted">
                          —
                        </td>
                      );
                    }
                    const selected = selectedOptionId === option.id;
                    return (
                      <td key={col.id} className="p-0.5">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setSelectedOptionId(option.id)}
                          className={`flex w-full flex-col items-center gap-1 rounded-lg border px-1 py-2.5 transition-colors ${
                            selected
                              ? "border-accent-cyan bg-accent-cyan/10"
                              : "border-border hover:border-accent-cyan/50"
                          } ${disabled ? "cursor-not-allowed opacity-60" : ""} ${
                            isSettled && option.isWinner ? "ring-2 ring-success" : ""
                          } ${isSettled && !option.isWinner ? "opacity-50" : ""}`}
                        >
                          <div className="text-sm font-bold text-accent-cyan">
                            {isSettled
                              ? option.isWinner
                                ? option.odds !== null
                                  ? `🏆確定×${option.odds.toFixed(1)}`
                                  : "🏆的中"
                                : "対象外"
                              : option.odds !== null
                                ? `×${option.odds.toFixed(1)}`
                                : "未賭け"}
                          </div>
                          <div className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                            あなたのエール: {(option.myBetAmount ?? 0).toLocaleString("ja-JP")}EC
                          </div>
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

      {!isLoggedIn && !isClosed && (
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
      {isClosed && !isSettled && (
        <p className="border-t border-border pt-3 text-sm font-semibold text-muted">
          締切られました
        </p>
      )}
      {!isClosed && <p className="text-xs text-muted">※最少10ptから</p>}
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
