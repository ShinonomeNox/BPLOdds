import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { StatusBadge } from "@/components/status-badge";
import { MatchTeamHeader } from "@/components/match-team-header";
import { Tabs, type TabItem } from "@/components/tabs";
import { formatGameLabel } from "@/lib/betting/format-game-label";
import type { GameTitle } from "@/types/database";

const GAME_TITLE_BADGE_CLASS: Record<GameTitle, string> = {
  ddr: "border-success/40 bg-success/15 text-success",
  sdvx: "border-game-sdvx/40 bg-game-sdvx/15 text-game-sdvx",
  iidx: "border-game-iidx/40 bg-game-iidx/15 text-game-iidx",
};

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

  function renderMatchList(list: NonNullable<typeof matches>) {
    return (
      <ul className="flex flex-col gap-3">
        {list.map((match) => {
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
          const gameLabel = formatGameLabel(match.game_key);
          return (
            <li key={match.id}>
              <Link
                href={`/matches/${match.id}`}
                className="card-surface flex flex-col gap-2 p-4 transition-colors hover:border-accent-cyan"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${GAME_TITLE_BADGE_CLASS[match.game_title]}`}
                  >
                    {match.game_title.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-2">
                    {gameLabel && (
                      <span className="text-xs text-muted">{gameLabel}</span>
                    )}
                    <StatusBadge status={match.status} />
                  </span>
                </div>
                <MatchTeamHeader teamA={teamA} teamB={teamB} size="sm" />
                <p className="text-center text-xs text-muted">
                  {new Date(match.start_time).toLocaleString("ja-JP")}
                </p>
              </Link>
            </li>
          );
        })}
        {list.length === 0 && (
          <p className="text-muted">対象の試合がありません</p>
        )}
      </ul>
    );
  }

  const openMatches = (matches ?? []).filter((m) => m.status === "scheduled");
  const closedMatches = (matches ?? []).filter((m) => m.status !== "scheduled");

  const tabs: TabItem[] = [
    { key: "open", label: "受付中", content: renderMatchList(openMatches) },
    { key: "closed", label: "終了", content: renderMatchList(closedMatches) },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="glow-text mb-6 text-2xl font-bold text-foreground">
        試合一覧
      </h1>
      <Tabs tabs={tabs} />
    </main>
  );
}
