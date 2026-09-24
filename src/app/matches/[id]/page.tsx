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

  const [
    { data: teamA },
    { data: teamB },
    { data: songs },
    { data: participants },
  ] = await Promise.all([
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="card-surface mb-6 p-5 sm:p-6">
        <span className="mb-2 inline-block rounded-full border border-accent-purple/40 bg-accent-purple/15 px-2 py-0.5 text-xs font-semibold text-accent-purple">
          {match.game_title.toUpperCase()}
        </span>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          <Link
            href={`/teams/${match.team_a_id}`}
            className="underline decoration-accent-cyan/50 hover:text-accent-cyan"
          >
            {teamA?.name}
          </Link>{" "}
          <span className="text-muted">vs</span>{" "}
          <Link
            href={`/teams/${match.team_b_id}`}
            className="underline decoration-accent-cyan/50 hover:text-accent-cyan"
          >
            {teamB?.name}
          </Link>
        </h1>
        <p className="mt-1 text-sm text-muted">
          {new Date(match.start_time).toLocaleString("ja-JP")}
        </p>
        <div className="mt-3">
          <MatchRealtimeStatus matchId={match.id} initialStatus={match.status} />
        </div>

        {(participants ?? []).length > 0 && (
          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">出場選手</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {(participants ?? []).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/players/${p.player_id}`}
                    className="text-muted underline decoration-accent-cyan/50 hover:text-accent-cyan"
                  >
                    [{p.team_side.toUpperCase()}]{" "}
                    {playerNameById.get(p.player_id) ?? p.player_id}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {betTypes.map((betType) => (
          <div key={betType.id} className="card-surface p-4 sm:p-5">
            <p className="mb-2 font-semibold text-foreground">
              {betType.label}
            </p>
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
          <div key={song.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">
                曲{song.song_number}
              </p>
              <SongRealtimeStatus
                songId={song.id}
                initialStatus={song.status}
              />
            </div>
            {songBetTypesList[index].map((betType) => (
              <div key={betType.id} className="card-surface p-4 sm:p-5">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  {betType.label}
                </p>
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
      </div>
    </main>
  );
}
