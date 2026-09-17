"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

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
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "ログインに失敗しました");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-bold">ログイン</h1>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm">ログインID</span>
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">パスワード</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          ログイン
        </button>
      </form>
    </main>
  );
}
