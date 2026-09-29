"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "bpl_seen_win_bet_ids";

interface WonBet {
  id: string;
  amount: number;
  payoutAmount: number;
}

function loadSeenIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function WinNotifier() {
  const [toasts, setToasts] = useState<WonBet[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function checkWins() {
      try {
        const res = await fetch("/api/bets/won");
        if (!res.ok) return;
        const data = (await res.json()) as { wins?: WonBet[] };
        const wins = data.wins ?? [];
        if (wins.length === 0 || cancelled) return;

        const seen = loadSeenIds();
        const newWins = wins.filter((w) => !seen.has(w.id));
        if (newWins.length === 0) return;

        for (const w of newWins) seen.add(w.id);
        saveSeenIds(seen);
        setToasts((prev) => [...prev, ...newWins]);
      } catch {
        // ネットワークエラー等は無視（次回アクセス時に再チェックされる）
      }
    }

    checkWins();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <WinToast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function WinToast({ toast, onDismiss }: { toast: WonBet; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <button
      type="button"
      onClick={onDismiss}
      className="btn-primary flex max-w-sm flex-col items-center gap-1 rounded-xl px-6 py-4 text-center shadow-lg"
    >
      <span className="text-base font-extrabold">🎉 あなたの予想的中！</span>
      <span className="text-lg font-extrabold">
        {toast.payoutAmount.toLocaleString("ja-JP")}エール獲得！
      </span>
    </button>
  );
}
