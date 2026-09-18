import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CreateTeamForm } from "@/components/admin/create-team-form";

export default async function AdminTeamsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p>管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, game_title")
    .order("name");

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">チーム管理</h1>
        <Link href="/admin" className="text-sm underline">
          管理トップへ戻る
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">新規作成</h2>
        <CreateTeamForm />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">一覧</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {(teams ?? []).map((team) => (
            <li key={team.id}>
              {team.name}（{team.game_title.toUpperCase()}）
            </li>
          ))}
          {(teams ?? []).length === 0 && (
            <p className="text-gray-400">チームがまだありません</p>
          )}
        </ul>
      </section>
    </main>
  );
}
