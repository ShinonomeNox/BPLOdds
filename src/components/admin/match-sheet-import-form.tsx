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

DDR\tテーマ\tレベル\t選手A\t選手B\t選手A2\t選手B2
1st\tCLASSIC STANDARD\t13-14\tRINBO-\tGOMANA2
2nd\tCLASSIC TRICKY\t16-17\tMAMURU3\tGIEZ-ACE`;

export function MatchSheetImportForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [startTime, setStartTime] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit() {
    if (!startTime) {
      setResult({ error: "開始日時を指定してください" });
      return;
    }
    setIsPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/matches/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          startTime: new Date(startTime).toISOString(),
        }),
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
        スプレッドシートの対戦カード表（Game / Team A / Team B / 機種ごとの曲・出場選手一覧）をそのままコピーして貼り付けてください。対戦形式は機種で自動判定します（DDR/SDVX=タッグ、IIDX=シングル）。
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">開始日時（全機種共通）</span>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="input-base max-w-xs"
        />
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={10}
        className="input-base w-full font-mono text-xs"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || text.trim().length === 0}
        className="btn-primary self-start text-sm"
      >
        対戦カードを一括インポート
      </button>
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
