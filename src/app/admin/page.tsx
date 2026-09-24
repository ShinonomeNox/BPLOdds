import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CreateMatchForm } from "@/components/admin/create-match-form";
import { StatusBadge } from "@/components/status-badge";

const MASTER_LINKS = [
  { href: "/admin/teams", label: "チーム管理" },
  { href: "/admin/players", label: "選手管理" },
  { href: "/admin/songs", label: "課題曲マスタ管理" },
  { href: "/admin/legacy-stats", label: "前シーズン統計管理" },
  { href: "/admin/users", label: "ユーザー管理" },
];

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">管理者権限が必要です。</p>
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="glow-text mb-6 text-2xl font-bold text-foreground">
        運営管理画面
      </h1>

      <section className="card-surface mb-6 p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
          マスターデータ管理
        </h2>
        <div className="flex flex-wrap gap-2">
          {MASTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="btn-secondary text-sm">
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="card-surface mb-6 p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
          試合を作成
        </h2>
        <CreateMatchForm teams={teams ?? []} />
      </section>

      <section className="card-surface p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
          試合一覧
        </h2>
        <ul className="flex flex-col gap-2">
          {(matches ?? []).map((match) => (
            <li key={match.id}>
              <Link
                href={`/admin/matches/${match.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:border-accent-cyan"
              >
                <span className="text-foreground">
                  {match.game_title.toUpperCase()} /{" "}
                  {new Date(match.start_time).toLocaleString("ja-JP")}
                </span>
                <StatusBadge status={match.status} />
              </Link>
            </li>
          ))}
          {(matches ?? []).length === 0 && (
            <p className="text-sm text-muted">試合がまだありません</p>
          )}
        </ul>
      </section>
    </main>
  );
}
