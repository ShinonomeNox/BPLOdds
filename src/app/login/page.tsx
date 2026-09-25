"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface LoginResponse {
  error?: string;
  bonusAwarded?: boolean;
  bonusAmount?: number;
}

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [bonusAmount, setBonusAmount] = useState<number | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setError(data.error ?? "ログインに失敗しました");
        return;
      }

      if (data.bonusAwarded && data.bonusAmount) {
        setBonusAmount(data.bonusAmount);
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  function handleCloseBonus() {
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="card-surface w-full max-w-sm p-6 sm:p-8">
        <h1 className="glow-text mb-6 text-center text-xl font-bold text-foreground">
          ログイン
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">ログインID</span>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              className="input-base"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-base"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={isPending} className="btn-primary">
            ログイン
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          ※ログインID・パスワードを忘れた場合、復旧はできません。お手数ですが新しいアカウントを作成してください
        </p>
      </div>

      {bonusAmount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card-surface w-full max-w-xs p-6 text-center">
            <p className="glow-text mb-2 text-lg font-bold text-foreground">
              ログインボーナス獲得！
            </p>
            <p className="mb-4 text-3xl font-extrabold text-accent-cyan">
              +{bonusAmount.toLocaleString("ja-JP")} EC
            </p>
            <button
              type="button"
              onClick={handleCloseBonus}
              className="btn-primary w-full"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
