import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ShareBonusButton } from "@/components/share-bonus-button";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="flex-1">
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-16 text-center sm:py-24">
        <h1 className="glow-text text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          BPエール
        </h1>
        <p className="max-w-xl text-sm text-muted sm:text-base">
          BEMANI PRO LEAGUE SEASON 6 エール応援サイト
          <br className="hidden sm:block" />
          （非公式ファン企画）
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/matches" className="btn-primary">
            試合一覧を見る
          </Link>
          <Link href="/teams" className="btn-secondary">
            チーム一覧
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-md px-4 pb-20 sm:pb-28">
        {user ? (
          <div className="card-surface flex flex-col items-center gap-3 p-6 text-center sm:p-8">
            <p className="text-sm text-muted">ようこそ</p>
            <p className="text-lg font-bold text-foreground">
              {user.loginId} さん
            </p>
            <p className="text-sm text-muted">
              所持エールコイン:{" "}
              <span className="text-xl font-bold text-accent-cyan">
                {user.coins}
              </span>{" "}
              EC
            </p>
            <ShareBonusButton available={user.shareBonusAvailable} />
          </div>
        ) : (
          <div className="card-surface flex flex-col items-center gap-4 p-6 text-center sm:p-8">
            <p className="text-sm text-muted">
              アカウントを作って選手・チームにエールを送ろう
            </p>
            <div className="flex gap-3">
              <Link href="/login" className="btn-secondary">
                ログイン
              </Link>
              <Link href="/register" className="btn-primary">
                新規登録
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
