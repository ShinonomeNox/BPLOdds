import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { LogoutButton } from "@/components/logout-button";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">BPLOdds</h1>
      <p className="text-sm text-gray-500">
        BEMANI PRO LEAGUE SEASON 6 勝敗予想サイト
      </p>

      {user ? (
        <div className="flex flex-col items-center gap-3">
          <p>
            ようこそ、<span className="font-semibold">{user.loginId}</span>{" "}
            さん
          </p>
          <p>
            所持コイン: <span className="font-semibold">{user.coins}</span>
          </p>
          <LogoutButton />
        </div>
      ) : (
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded bg-black px-4 py-2 text-white"
          >
            ログイン
          </Link>
          <Link
            href="/register"
            className="rounded border border-black px-4 py-2"
          >
            新規登録
          </Link>
        </div>
      )}
    </main>
  );
}
