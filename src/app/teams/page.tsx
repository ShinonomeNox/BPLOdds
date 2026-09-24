import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

export default async function TeamsPage() {
  const supabase = createServiceClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, game_title")
    .order("name");

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-bold">チーム一覧</h1>

      {GAME_TITLES.map((gameTitle) => {
        const teamsInGame = (teams ?? []).filter(
          (t) => t.game_title === gameTitle,
        );
        if (teamsInGame.length === 0) {
          return null;
        }
        return (
          <section key={gameTitle} className="flex flex-col gap-2">
            <h2 className="font-semibold">{gameTitle.toUpperCase()}</h2>
            <ul className="flex flex-wrap gap-3 text-sm">
              {teamsInGame.map((team) => (
                <li key={team.id}>
                  <Link href={`/teams/${team.id}`} className="underline">
                    {team.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {(teams ?? []).length === 0 && (
        <p className="text-sm text-gray-400">チームがまだありません</p>
      )}
    </main>
  );
}
