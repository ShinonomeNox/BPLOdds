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
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-bold">選手一覧</h1>

      {GAME_TITLES.map((gameTitle) => {
        const playersInGame = (players ?? []).filter(
          (p) => p.game_title === gameTitle,
        );
        if (playersInGame.length === 0) {
          return null;
        }
        return (
          <section key={gameTitle} className="flex flex-col gap-2">
            <h2 className="font-semibold">{gameTitle.toUpperCase()}</h2>
            <ul className="flex flex-wrap gap-3 text-sm">
              {playersInGame.map((player) => (
                <li key={player.id}>
                  <Link href={`/players/${player.id}`} className="underline">
                    {player.name}
                  </Link>
                  <span className="text-gray-400">
                    {" "}
                    （{teamNameById.get(player.team_id) ?? "?"}）
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {(players ?? []).length === 0 && (
        <p className="text-sm text-gray-400">選手がまだいません</p>
      )}
    </main>
  );
}
