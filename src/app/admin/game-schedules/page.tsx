import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { BulkImportForm } from "@/components/admin/bulk-import-form";
import { GameScheduleListItem } from "@/components/admin/game-schedule-list-item";
import { scheduleSortKey } from "@/lib/admin/game-schedule-sort";

export default async function AdminGameSchedulesPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data: schedules } = await supabase.from("game_schedules").select("*");
  const sorted = [...(schedules ?? [])].sort(
    (a, b) => scheduleSortKey(a.game_key) - scheduleSortKey(b.game_key),
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="glow-text text-xl font-bold text-foreground sm:text-2xl">
          試合日程管理
        </h1>
        <Link href="/admin" className="text-sm text-accent-cyan underline">
          管理トップへ戻る
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <BulkImportForm
          endpoint="/api/admin/game-schedules/bulk"
          helpText={
            "「Game / Date / Time」形式で貼り付けてください（例: 1\\t2026-11-25\\t20:00）。Gameは1〜21またはsemi1/semi2/finalで指定します。既存のGameは上書き更新されます。"
          }
          placeholder={"1\t2026-11-25\t20:00\n2\t2026-12-02\t20:00"}
        />

        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            一覧
          </h2>
          <ul className="flex flex-col gap-1">
            {sorted.map((schedule) => (
              <GameScheduleListItem key={schedule.game_key} schedule={schedule} />
            ))}
            {sorted.length === 0 && (
              <p className="text-sm text-muted">日程がまだ登録されていません</p>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
