import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { LogoutButton } from "@/components/logout-button";
import { ShareBonusButton } from "@/components/share-bonus-button";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">BPエール</h1>
      <p className="text-sm text-gray-500">
        BEMANI PRO LEAGUE SEASON 6 エール応援サイト（非公式ファン企画）
      </p>

      <Link href="/matches" className="text-sm underline">
        試合一覧を見る
      </Link>

      {user ? (
        <div className="flex flex-col items-center gap-3">
          <p>
            ようこそ、<span className="font-semibold">{user.loginId}</span>{" "}
            さん
          </p>
          <p>
            所持エールコイン:{" "}
            <span className="font-semibold">{user.coins} EC</span>
          </p>
          <Link href="/mypage" className="text-sm underline">
            マイページ（エール履歴・コイン増減履歴）
          </Link>
          <ShareBonusButton available={user.shareBonusAvailable} />
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
