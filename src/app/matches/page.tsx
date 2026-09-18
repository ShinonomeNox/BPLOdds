import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

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
    .select("id, name")
    .in("id", teamIds.length > 0 ? teamIds : [""]);
  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-4">
      <h1 className="text-xl font-bold">試合一覧</h1>
      <ul className="flex flex-col gap-2">
        {(matches ?? []).map((match) => (
          <li key={match.id} className="rounded border p-3">
            <Link href={`/matches/${match.id}`} className="underline">
              {match.game_title.toUpperCase()}:{" "}
              {teamNameById.get(match.team_a_id) ?? "?"} vs{" "}
              {teamNameById.get(match.team_b_id) ?? "?"}
            </Link>
            <p className="text-xs text-gray-500">
              {new Date(match.start_time).toLocaleString("ja-JP")} /{" "}
              {match.status}
            </p>
          </li>
        ))}
        {(matches ?? []).length === 0 && (
          <p className="text-gray-400">試合がまだありません</p>
        )}
      </ul>
    </main>
  );
}
