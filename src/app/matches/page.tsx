import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { StatusBadge } from "@/components/status-badge";
import { MatchTeamHeader } from "@/components/match-team-header";

export default async function MatchesPage() {
  const supabase = createServiceClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("start_time", { ascending: true });

  const teamIds = Array.from(
    new Set((matches ?? []).flatMap((m) => [m.team_a_id, m.team_b_id])),
  );
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, color")
    .in("id", teamIds.length > 0 ? teamIds : [""]);
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="glow-text mb-6 text-2xl font-bold text-foreground">
        試合一覧
      </h1>
      <ul className="flex flex-col gap-3">
        {(matches ?? []).map((match) => {
          const teamA = teamById.get(match.team_a_id) ?? {
            id: match.team_a_id,
            name: "?",
            color: null,
          };
          const teamB = teamById.get(match.team_b_id) ?? {
            id: match.team_b_id,
            name: "?",
            color: null,
          };
          return (
            <li key={match.id}>
              <Link
                href={`/matches/${match.id}`}
                className="card-surface flex flex-col gap-2 p-4 transition-colors hover:border-accent-cyan"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-accent-purple/40 bg-accent-purple/15 px-2 py-0.5 text-xs font-semibold text-accent-purple">
                    {match.game_title.toUpperCase()}
                  </span>
                  <StatusBadge status={match.status} />
                </div>
                <MatchTeamHeader teamA={teamA} teamB={teamB} size="sm" />
                <p className="text-center text-xs text-muted">
                  {new Date(match.start_time).toLocaleString("ja-JP")}
                </p>
              </Link>
            </li>
          );
        })}
        {(matches ?? []).length === 0 && (
          <p className="text-muted">試合がまだありません</p>
        )}
      </ul>
    </main>
  );
}
