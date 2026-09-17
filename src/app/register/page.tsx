"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useRecaptcha } from "@/lib/recaptcha/use-recaptcha";

export default function RegisterPage() {
  const router = useRouter();
  const { execute } = useRecaptcha();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const recaptchaToken = await execute("register");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password, recaptchaToken }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-bold">新規登録</h1>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm">
            ログインID（英数字・アンダースコア、3〜20文字）
          </span>
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">パスワード（8文字以上）</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="rounded border px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          登録する
        </button>
      </form>
      <p className="text-xs text-gray-400">
        このサイトはreCAPTCHAによって保護されています。
      </p>
    </main>
  );
}
