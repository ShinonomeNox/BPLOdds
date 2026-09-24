"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface BulkImportResponse {
  error?: string;
  successCount?: number;
  errors?: { line: number; message: string }[];
}

export function BulkImportForm({
  endpoint,
  placeholder,
  helpText,
}: {
  endpoint: string;
  placeholder: string;
  helpText: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<BulkImportResponse | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit() {
    setIsPending(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as BulkImportResponse;
      if (!res.ok) {
        setResult({ error: data.error ?? "一括登録に失敗しました" });
        return;
      }
      setResult(data);
      if ((data.successCount ?? 0) > 0) {
        setText("");
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card-surface p-4 sm:p-5">
      <p className="mb-1 text-sm font-semibold text-foreground">一括登録</p>
      <p className="mb-2 text-xs text-muted">{helpText}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="input-base w-full font-mono text-xs"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || text.trim().length === 0}
        className="btn-primary mt-2 text-sm"
      >
        一括登録する
      </button>
      {result?.error && (
        <p className="mt-2 text-sm text-danger">{result.error}</p>
      )}
      {result && !result.error && (
        <div className="mt-2 text-sm">
          <p className="text-success">
            {result.successCount}件登録しました
          </p>
          {(result.errors ?? []).length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5 text-xs text-danger">
              {(result.errors ?? []).map((e) => (
                <li key={e.line}>
                  {e.line}行目: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
