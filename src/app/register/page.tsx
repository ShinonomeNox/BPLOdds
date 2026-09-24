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
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="card-surface w-full max-w-sm p-6 sm:p-8">
        <h1 className="glow-text mb-6 text-center text-xl font-bold text-foreground">
          新規登録
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">
              ログインID（英数字・アンダースコア、3〜20文字）
            </span>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              className="input-base"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">パスワード（8文字以上）</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="input-base"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={isPending} className="btn-primary">
            登録する
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          ※非公式のファン企画です
        </p>
        <p className="mt-1 text-center text-xs text-muted">
          このサイトはreCAPTCHAによって保護されています。
        </p>
      </div>
    </main>
  );
}
