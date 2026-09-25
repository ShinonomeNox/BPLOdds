"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useRecaptcha } from "@/lib/recaptcha/use-recaptcha";

interface RegisterResponse {
  error?: string;
  coins?: number;
  bonusAmount?: number;
}

export default function RegisterPage() {
  const router = useRouter();
  const { execute } = useRecaptcha();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [welcomeCoins, setWelcomeCoins] = useState<number | null>(null);

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
      const data = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }

      setWelcomeCoins(data.coins ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setIsPending(false);
    }
  }

  function handleCloseWelcome() {
    router.push("/");
    router.refresh();
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
        <div className="mt-5 rounded-lg border border-border bg-background-elevated/50 p-3 text-xs text-muted">
          <p className="mb-1 font-semibold text-foreground">
            ご利用にあたって
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>本サービスは非公式のファン企画です</li>
            <li>メールアドレスなどの個人情報は一切取得していません</li>
            <li>
              パスワードは暗号化して保存しており、運営側でも元の値を確認・復元できません
            </li>
            <li>
              ログインID・パスワードを忘れた場合は復旧できません。忘れた場合はお手数ですが新しいアカウントを作成してください
            </li>
          </ul>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          このサイトはreCAPTCHAによって保護されています。
        </p>
      </div>

      {welcomeCoins !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card-surface w-full max-w-xs p-6 text-center">
            <p className="glow-text mb-2 text-lg font-bold text-foreground">
              登録完了！ようこそ
            </p>
            <p className="mb-4 text-3xl font-extrabold text-accent-cyan">
              {welcomeCoins.toLocaleString("ja-JP")} EC
            </p>
            <p className="mb-4 text-xs text-muted">
              初期付与＋ログインボーナスを受け取りました
            </p>
            <button
              type="button"
              onClick={handleCloseWelcome}
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
