import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CreateLegacyStatForm } from "@/components/admin/create-legacy-stat-form";
import { BulkImportForm } from "@/components/admin/bulk-import-form";

export default async function AdminLegacyStatsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const [{ data: players }, { data: stats }] = await Promise.all([
    supabase.from("players").select("id, name").order("name"),
    supabase
      .from("player_legacy_stats")
      .select(
        "id, player_id, season, category_type, category_value, wins, plays",
      )
      .order("season", { ascending: false }),
  ]);

  const playerNameById = new Map((players ?? []).map((p) => [p.id, p.name]));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="glow-text text-xl font-bold text-foreground sm:text-2xl">
          前シーズン統計管理
        </h1>
        <Link href="/admin" className="text-sm text-accent-cyan underline">
          管理トップへ戻る
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            新規登録
          </h2>
          <CreateLegacyStatForm players={players ?? []} />
        </section>

        <BulkImportForm
          endpoint="/api/admin/legacy-stats/bulk"
          helpText="1行に「選手名, シーズン, 区分(theme/level), 区分値, 勝利数, プレイ数」の形式で入力してください（選手名は完全一致が必要です）"
          placeholder={"DOLPHIN, season5, theme, graduation, 7, 12\nDOLPHIN, season5, level, 11, 5, 8"}
        />

        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            一覧
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {(stats ?? []).map((stat) => (
              <li
                key={stat.id}
                className="flex justify-between border-b border-border py-1 last:border-b-0"
              >
                <span className="text-foreground">
                  {playerNameById.get(stat.player_id) ?? stat.player_id} /{" "}
                  {stat.season} /{" "}
                  {stat.category_type === "theme" ? "テーマ" : "レベル"}:{" "}
                  {stat.category_value}
                </span>
                <span className="text-muted">
                  {stat.wins}勝 {stat.plays}戦
                </span>
              </li>
            ))}
            {(stats ?? []).length === 0 && (
              <p className="text-muted">データがまだありません</p>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
