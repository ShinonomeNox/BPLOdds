import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CreateTeamForm } from "@/components/admin/create-team-form";
import { TeamListItem } from "@/components/admin/team-list-item";
import { BulkImportForm } from "@/components/admin/bulk-import-form";

export default async function AdminTeamsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, game_title")
    .order("name");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="glow-text text-xl font-bold text-foreground sm:text-2xl">
          チーム管理
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
          <CreateTeamForm />
        </section>

        <BulkImportForm
          endpoint="/api/admin/teams/bulk"
          helpText="1行に「チーム名, 機種(iidx/sdvx/ddr)」の形式で入力してください（スプレッドシートからのコピー貼り付け可）"
          placeholder={"RENSAGE, iidx\nDIVER-SE, sdvx"}
        />

        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            一覧
          </h2>
          <ul className="flex flex-col gap-1">
            {(teams ?? []).map((team) => (
              <TeamListItem key={team.id} team={team} />
            ))}
            {(teams ?? []).length === 0 && (
              <p className="text-sm text-muted">チームがまだありません</p>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
