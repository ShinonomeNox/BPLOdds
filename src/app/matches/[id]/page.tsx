import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { BetForm } from "@/components/bet-form";
import { MatchRealtimeStatus } from "@/components/realtime/match-realtime-status";
import { SongRealtimeStatus } from "@/components/realtime/song-realtime-status";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!match) {
    notFound();
  }

  const [{ data: teamA }, { data: teamB }, { data: songs }, { data: participants }] =
    await Promise.all([
      supabase.from("teams").select("name").eq("id", match.team_a_id).single(),
      supabase.from("teams").select("name").eq("id", match.team_b_id).single(),
      supabase
        .from("tag_battle_songs")
        .select("*")
        .eq("match_id", id)
        .order("song_number"),
      supabase
        .from("match_participants")
        .select("id, player_id, team_side")
        .eq("match_id", id),
    ]);

  const [betTypes, user] = await Promise.all([
    getBetTypesWithOptions(supabase, { matchId: id }),
    getCurrentUser(),
  ]);

  const { data: players } = await supabase
    .from("players")
    .select("id, name")
    .in(
      "id",
      (participants ?? []).map((p) => p.player_id).length > 0
        ? (participants ?? []).map((p) => p.player_id)
        : [""],
    );
  const playerNameById = new Map((players ?? []).map((p) => [p.id, p.name]));

  const songBetTypesList = await Promise.all(
    (songs ?? []).map((song) =>
      getBetTypesWithOptions(supabase, { songId: song.id }),
    ),
  );

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">
          <Link href={`/teams/${match.team_a_id}`} className="underline">
            {teamA?.name}
          </Link>{" "}
          vs{" "}
          <Link href={`/teams/${match.team_b_id}`} className="underline">
            {teamB?.name}
          </Link>
        </h1>
        <p className="text-sm text-gray-500">
          {new Date(match.start_time).toLocaleString("ja-JP")}
        </p>
      </div>

      <MatchRealtimeStatus matchId={match.id} initialStatus={match.status} />

      {(participants ?? []).length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">出場選手</p>
          <ul className="flex flex-wrap gap-3 text-sm">
            {(participants ?? []).map((p) => (
              <li key={p.id}>
                <Link href={`/players/${p.player_id}`} className="underline">
                  [{p.team_side.toUpperCase()}]{" "}
                  {playerNameById.get(p.player_id) ?? p.player_id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {betTypes.map((betType) => (
        <div key={betType.id} className="rounded border p-4 flex flex-col gap-2">
          <p className="font-semibold">{betType.label}</p>
          {betType.options.map((option) => (
            <BetForm
              key={option.id}
              betOptionId={option.id}
              label={option.label}
              isLoggedIn={!!user}
            />
          ))}
        </div>
      ))}

      {(songs ?? []).map((song, index) => (
        <div key={song.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold">曲{song.song_number}</p>
            <SongRealtimeStatus songId={song.id} initialStatus={song.status} />
          </div>
          {songBetTypesList[index].map((betType) => (
            <div
              key={betType.id}
              className="rounded border p-4 flex flex-col gap-2"
            >
              <p className="text-sm font-semibold">{betType.label}</p>
              {betType.options.map((option) => (
                <BetForm
                  key={option.id}
                  betOptionId={option.id}
                  label={option.label}
                  isLoggedIn={!!user}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
