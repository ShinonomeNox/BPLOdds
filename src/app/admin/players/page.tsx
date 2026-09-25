import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CreatePlayerForm } from "@/components/admin/create-player-form";
import { PlayerListItem } from "@/components/admin/player-list-item";
import { BulkImportForm } from "@/components/admin/bulk-import-form";

export default async function AdminPlayersPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const [{ data: teams }, { data: players }] = await Promise.all([
    supabase.from("teams").select("id, name, game_title").order("name"),
    supabase
      .from("players")
      .select("id, name, game_title, team_id")
      .order("team_id")
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("name"),
  ]);

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="glow-text text-xl font-bold text-foreground sm:text-2xl">
          選手管理
        </h1>
        <Link href="/admin" className="text-sm text-accent-cyan underline">
          管理トップへ戻る
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            新規作成
          </h2>
          <CreatePlayerForm teams={teams ?? []} />
        </section>

        <BulkImportForm
          endpoint="/api/admin/players/bulk"
          helpText="1行に「所属チーム名, 機種(iidx/sdvx/ddr), 選手名」の形式で入力してください（チーム名は完全一致が必要です。同名チームでも機種ごとに別チームとして扱われます）"
          placeholder={"APINA VRAMeS, iidx, UCCHIE\nAPINA VRAMeS, sdvx, MINATO"}
        />

        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            一覧
          </h2>
          <ul className="flex flex-col gap-1">
            {(players ?? []).map((player) => (
              <PlayerListItem
                key={player.id}
                player={player}
                teams={teams ?? []}
                teamName={teamNameById.get(player.team_id) ?? "?"}
              />
            ))}
            {(players ?? []).length === 0 && (
              <p className="text-sm text-muted">選手がまだいません</p>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
