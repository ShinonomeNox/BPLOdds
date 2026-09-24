import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

export default async function PlayersPage() {
  const supabase = createServiceClient();
  const [{ data: players }, { data: teams }] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, game_title, team_id")
      .order("name"),
    supabase.from("teams").select("id, name"),
  ]);

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="glow-text mb-6 text-2xl font-bold text-foreground">
        選手一覧
      </h1>

      <div className="flex flex-col gap-6">
        {GAME_TITLES.map((gameTitle) => {
          const playersInGame = (players ?? []).filter(
            (p) => p.game_title === gameTitle,
          );
          if (playersInGame.length === 0) {
            return null;
          }
          return (
            <section key={gameTitle} className="flex flex-col gap-3">
              <h2 className="text-sm font-bold tracking-wide text-accent-cyan">
                {gameTitle.toUpperCase()}
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {playersInGame.map((player) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="card-surface flex items-center justify-between px-4 py-3 text-sm transition-colors hover:border-accent-cyan"
                  >
                    <span className="font-semibold text-foreground">
                      {player.name}
                    </span>
                    <span className="text-muted">
                      {teamNameById.get(player.team_id) ?? "?"}
                    </span>
                  </Link>
                ))}
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
