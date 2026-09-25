import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];
const GAME_TITLE_LABEL: Record<GameTitle, string> = {
  iidx: "IIDX",
  sdvx: "SDVX",
  ddr: "DDR",
};

export default async function PlayersPage() {
  const supabase = createServiceClient();
  const [{ data: players }, { data: teams }] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, game_title, team_id")
      .order("team_id")
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase.from("teams").select("id, name, game_title, color"),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="glow-text mb-6 text-2xl font-bold text-foreground">
        選手一覧
      </h1>

      <div className="flex flex-col gap-6">
        {GAME_TITLES.map((gameTitle) => {
          const teamsInGame = (teams ?? [])
            .filter((t) => t.game_title === gameTitle)
            .sort((a, b) => a.name.localeCompare(b.name, "ja"));
          if (teamsInGame.length === 0) {
            return null;
          }
          return (
            <section key={gameTitle} className="flex flex-col gap-3">
              <h2 className="text-sm font-bold tracking-wide text-accent-cyan">
                {GAME_TITLE_LABEL[gameTitle]}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {teamsInGame.map((team) => {
                  const teamPlayers = (players ?? []).filter(
                    (p) => p.team_id === team.id,
                  );
                  return (
                    <div
                      key={team.id}
                      className="card-surface p-4"
                      style={
                        team.color
                          ? { borderLeft: `4px solid ${team.color}` }
                          : undefined
                      }
                    >
                      <Link
                        href={`/teams/${team.id}`}
                        className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground hover:text-accent-cyan"
                      >
                        {team.color && (
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                        )}
                        {team.name}
                      </Link>
                      <div className="grid grid-cols-2 gap-1.5">
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
            </section>
          );
        })}
      </div>

      {(players ?? []).length === 0 && (
        <p className="text-sm text-muted">選手がまだいません</p>
      )}
    </main>
  );
}
