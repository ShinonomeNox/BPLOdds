import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

export default async function TeamsPage() {
  const supabase = createServiceClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, game_title, color")
    .order("name");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="glow-text mb-6 text-2xl font-bold text-foreground">
        チーム一覧
      </h1>

      <div className="flex flex-col gap-6">
        {GAME_TITLES.map((gameTitle) => {
          const teamsInGame = (teams ?? []).filter(
            (t) => t.game_title === gameTitle,
          );
          if (teamsInGame.length === 0) {
            return null;
          }
          return (
            <section key={gameTitle} className="flex flex-col gap-3">
              <h2 className="text-sm font-bold tracking-wide text-accent-cyan">
                {gameTitle.toUpperCase()}
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {teamsInGame.map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}`}
                    className="card-surface flex items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent-cyan"
                    style={
                      team.color
                        ? { borderLeft: `4px solid ${team.color}` }
                        : undefined
                    }
                  >
                    {team.color && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                    )}
                    {team.name}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {(teams ?? []).length === 0 && (
        <p className="text-sm text-muted">チームがまだありません</p>
      )}
    </main>
  );
}
