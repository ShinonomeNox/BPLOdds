import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CreateMatchForm } from "@/components/admin/create-match-form";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p>管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const [{ data: teams }, { data: matches }] = await Promise.all([
    supabase.from("teams").select("id, name, game_title").order("name"),
    supabase
      .from("matches")
      .select("id, game_title, status, start_time")
      .order("start_time", { ascending: false }),
  ]);

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full flex flex-col gap-8">
      <h1 className="text-xl font-bold">運営管理画面</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">マスターデータ管理</h2>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/teams" className="underline">
            チーム管理
          </Link>
          <Link href="/admin/players" className="underline">
            選手管理
          </Link>
          <Link href="/admin/songs" className="underline">
            課題曲マスタ管理
          </Link>
          <Link href="/admin/legacy-stats" className="underline">
            前シーズン統計管理
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">試合を作成</h2>
        <CreateMatchForm teams={teams ?? []} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">試合一覧</h2>
        <ul className="flex flex-col gap-2">
          {(matches ?? []).map((match) => (
            <li key={match.id} className="rounded border p-3">
              <Link href={`/admin/matches/${match.id}`} className="underline">
                {match.game_title.toUpperCase()} /{" "}
                {new Date(match.start_time).toLocaleString("ja-JP")} /{" "}
                {match.status}
              </Link>
            </li>
          ))}
          {(matches ?? []).length === 0 && (
            <p className="text-sm text-gray-400">試合がまだありません</p>
          )}
        </ul>
      </section>
    </main>
  );
}
