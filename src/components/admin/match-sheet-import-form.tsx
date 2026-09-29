"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ImportResponse {
  error?: string;
  matches?: { gameTitle: string; matchId: string }[];
  errors?: string[];
}

const PLACEHOLDER = `Game\t1
Team A\tAPINA VRAMeS
Team B\tLEISURELAND

DDR\t試合形式\tテーマ\tレベル\t選手A\t選手B\t選手A2\t選手B2
1st\tシングルバトル\tCLASSIC STANDARD\t13-14\tRINBO-\tGOMANA2`;

export function MatchSheetImportForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit() {
    setIsPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/matches/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as ImportResponse;
      if (!res.ok) {
        setResult({ error: data.error ?? "インポートに失敗しました" });
        return;
      }
      setResult(data);
      if ((data.matches ?? []).length > 0) {
        setText("");
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        スプレッドシートの対戦カード表（Game / Team A / Team B / 機種ごとの試合形式・曲・出場選手一覧）をそのままコピーして貼り付けてください。開始日時は先頭の「Game」番号から
        <a href="/admin/game-schedules" className="text-accent-cyan underline">
          試合日程管理
        </a>
        の登録内容を自動参照します。
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={10}
        disabled={isPending}
        className="input-base w-full font-mono text-xs disabled:opacity-60"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || text.trim().length === 0}
        className="btn-primary flex items-center gap-2 self-start text-sm"
      >
        {isPending && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {isPending ? "インポート中…" : "対戦カードを一括インポート"}
      </button>
      {isPending && (
        <p className="text-xs text-muted">
          処理中です。ページ遷移せずそのままお待ちください。
        </p>
      )}
      {result?.error && <p className="text-sm text-danger">{result.error}</p>}
      {result && !result.error && (
        <div className="text-sm">
          <p className="text-success">
            {(result.matches ?? []).length}試合を作成しました（
            {(result.matches ?? [])
              .map((m) => m.gameTitle.toUpperCase())
              .join(" / ")}
            ）
          </p>
          {(result.errors ?? []).length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5 text-xs text-danger">
              {(result.errors ?? []).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
