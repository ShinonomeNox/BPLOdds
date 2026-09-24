import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DonateTeamForm } from "@/components/donate-team-form";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, game_title")
    .eq("id", id)
    .maybeSingle();

  if (!team) {
    notFound();
  }

  const [{ data: yellPoints }, { data: players }, user] = await Promise.all([
    supabase
      .from("team_yell_points")
      .select("total_points")
      .eq("team_id", id)
      .maybeSingle(),
    supabase.from("players").select("id, name").eq("team_id", id).order("name"),
    getCurrentUser(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="card-surface mb-6 flex flex-col items-center gap-4 p-6 text-center sm:p-8">
        <div>
          <h1 className="glow-text text-2xl font-bold text-foreground">
            {team.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {team.game_title.toUpperCase()}
          </p>
        </div>

        <p className="text-sm text-muted">
          エールポイント
          <br />
          <span className="text-3xl font-extrabold text-accent-cyan">
            {(yellPoints?.total_points ?? 0).toLocaleString("ja-JP")}
          </span>{" "}
          pt
        </p>

        <DonateTeamForm teamId={team.id} isLoggedIn={!!user} />
      </div>

      {(players ?? []).length > 0 && (
        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            所属選手
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(players ?? []).map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="rounded-lg border border-border px-3 py-2 text-center text-sm text-foreground transition-colors hover:border-accent-cyan hover:text-accent-cyan"
              >
                {player.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
