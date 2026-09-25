import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];
const GAME_TITLE_LABEL: Record<GameTitle, string> = {
  iidx: "IIDX",
  sdvx: "SDVX",
  ddr: "DDR",
};

export default async function TeamsPage() {
  const supabase = createServiceClient();
  const [{ data: teams }, { data: players }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, game_title, color")
      .order("name"),
    supabase
      .from("players")
      .select("id, name, team_id")
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("name"),
  ]);

  const playersByTeamId = new Map<
    string,
    { id: string; name: string }[]
  >();
  for (const player of players ?? []) {
    const list = playersByTeamId.get(player.team_id) ?? [];
    list.push(player);
    playersByTeamId.set(player.team_id, list);
  }

  const teamGroups = new Map<
    string,
    { name: string; teams: NonNullable<typeof teams>[number][] }
  >();
  for (const team of teams ?? []) {
    const group = teamGroups.get(team.name) ?? { name: team.name, teams: [] };
    group.teams.push(team);
    teamGroups.set(team.name, group);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="glow-text mb-6 text-2xl font-bold text-foreground">
        チーム一覧
      </h1>

      <div className="flex flex-col gap-5">
        {[...teamGroups.values()].map((group) => {
          const color = group.teams.find((t) => t.color)?.color ?? null;
          return (
            <div
              key={group.name}
              className="card-surface overflow-hidden"
              style={
                color
                  ? { boxShadow: `0 0 24px ${color}30` }
                  : undefined
              }
            >
              <div
                className="px-5 py-3"
                style={{
                  backgroundColor: color ?? "var(--surface-hover)",
                }}
              >
                <h2 className="text-lg font-extrabold text-white drop-shadow-sm">
                  {group.name}
                </h2>
              </div>
              <div className="flex flex-col gap-4 p-5">
                {GAME_TITLES.map((gameTitle) => {
                  const team = group.teams.find(
                    (t) => t.game_title === gameTitle,
                  );
                  if (!team) return null;
                  const teamPlayers = playersByTeamId.get(team.id) ?? [];
                  return (
                    <div key={gameTitle}>
                      <Link
                        href={`/teams/${team.id}`}
                        className="mb-1.5 inline-block text-xs font-bold tracking-wide text-accent-cyan hover:underline"
                      >
                        {GAME_TITLE_LABEL[gameTitle]}
                      </Link>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {teamPlayers.map((player) => (
                          <Link
                            key={player.id}
                            href={`/players/${player.id}`}
                            className="rounded-lg border border-border px-2 py-1.5 text-center text-sm text-foreground transition-colors hover:border-accent-cyan hover:text-accent-cyan"
                          >
                            {player.name}
                          </Link>
                        ))}
                        {teamPlayers.length === 0 && (
                          <p className="col-span-full text-xs text-muted">
                            選手未登録
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {(teams ?? []).length === 0 && (
        <p className="text-sm text-muted">チームがまだありません</p>
      )}
    </main>
  );
}
