"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AmountInput } from "@/components/amount-input";
import { BetOptionRow } from "@/components/bet-option-row";
import { StatusBadge } from "@/components/status-badge";
import type { TeamSide } from "@/types/database";

export interface BetOptionViewModel {
  id: string;
  label: string;
  subLabel?: string | null;
  odds: number | null;
  myBetAmount: number | null;
  side: TeamSide | null;
  isWinner?: boolean;
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
  isSettled = false,
  teamAColor,
  teamBColor,
  teamAName,
  teamBName,
}: {
  betTypeId: string;
  betTypeLabel: string;
  options: BetOptionViewModel[];
  isLoggedIn: boolean;
  isClosed: boolean;
  isSettled?: boolean;
  teamAColor?: string | null;
  teamBColor?: string | null;
  teamAName?: string | null;
  teamBName?: string | null;
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

  const groupA = options.filter((o) => o.side === "a");
  const groupDraw = options.filter((o) => o.side === null);
  const groupB = options.filter((o) => o.side === "b");
  const hasGroups = groupA.length > 0 || groupB.length > 0;
  const winners = options.filter((o) => o.isWinner);

  function renderOption(option: BetOptionViewModel, accentColor?: string | null) {
    return (
      <BetOptionRow
        key={option.id}
        optionId={option.id}
        label={option.label}
        subLabel={option.subLabel}
        odds={option.odds}
        myBetAmount={option.myBetAmount}
        groupName={betTypeId}
        selected={selectedOptionId === option.id}
        disabled={disabled}
        onSelect={() => setSelectedOptionId(option.id)}
        accentColor={accentColor}
        isSettled={isSettled}
        isWinner={option.isWinner}
      />
    );
  }

  return (
    <div className="card-surface flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">{betTypeLabel}</p>
        {isClosed && !isSettled && <StatusBadge status="settled" />}
      </div>

      {isSettled && winners.length > 0 && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm font-bold text-success">
          結果:{" "}
          {winners
            .map((w) => `${w.label}${w.odds !== null ? `（確定×${w.odds.toFixed(1)}）` : ""}`)
            .join(" / ")}
        </p>
      )}

      {hasGroups ? (
        <div className="grid grid-cols-2 gap-3">
          {groupA.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p
                className="text-center text-xs font-bold"
                style={teamAColor ? { color: teamAColor } : undefined}
              >
                {teamAName ?? "Aチーム"} WIN予想
              </p>
              {groupA.map((o) => renderOption(o, teamAColor))}
            </div>
          )}
          {groupB.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p
                className="text-center text-xs font-bold"
                style={teamBColor ? { color: teamBColor } : undefined}
              >
                {teamBName ?? "Bチーム"} WIN予想
              </p>
              {groupB.map((o) => renderOption(o, teamBColor))}
            </div>
          )}
          {groupDraw.length > 0 && (
            <div className="col-span-2 flex flex-col gap-1.5">
              <p className="text-center text-xs font-bold text-muted">
                引き分け予想
              </p>
              {groupDraw.map((o) => renderOption(o))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {options.map((o) => renderOption(o))}
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
