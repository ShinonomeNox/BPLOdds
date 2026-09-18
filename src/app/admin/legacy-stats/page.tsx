import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CreateLegacyStatForm } from "@/components/admin/create-legacy-stat-form";

export default async function AdminLegacyStatsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p>管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const [{ data: players }, { data: stats }] = await Promise.all([
    supabase.from("players").select("id, name").order("name"),
    supabase
      .from("player_legacy_stats")
      .select("id, player_id, season, category_type, category_value, wins, plays")
      .order("season", { ascending: false }),
  ]);

  const playerNameById = new Map((players ?? []).map((p) => [p.id, p.name]));

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">前シーズン統計管理</h1>
        <Link href="/admin" className="text-sm underline">
          管理トップへ戻る
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">新規登録</h2>
        <CreateLegacyStatForm players={players ?? []} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">一覧</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {(stats ?? []).map((stat) => (
            <li key={stat.id}>
              {playerNameById.get(stat.player_id) ?? stat.player_id} /{" "}
              {stat.season} / {stat.category_type === "theme" ? "テーマ" : "レベル"}:
              {stat.category_value} / {stat.wins}勝 {stat.plays}戦
            </li>
          ))}
          {(stats ?? []).length === 0 && (
            <p className="text-gray-400">データがまだありません</p>
          )}
        </ul>
      </section>
    </main>
  );
}
