import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { BetForm } from "@/components/bet-form";
import { MatchRealtimeStatus } from "@/components/realtime/match-realtime-status";
import { RoundRealtimeStatus } from "@/components/realtime/round-realtime-status";
import { SongRealtimeStatus } from "@/components/realtime/song-realtime-status";
import { MatchBettingTabs, type BettingTab } from "@/components/match-betting-tabs";
import { ROUND_FORMAT_LABEL_JA } from "@/lib/betting/match-format";

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
    { data: rounds },
    { data: songs },
    { data: participants },
    { data: strategyCardUsages },
    user,
  ] = await Promise.all([
    supabase.from("teams").select("name").eq("id", match.team_a_id).single(),
    supabase.from("teams").select("name").eq("id", match.team_b_id).single(),
    supabase
      .from("match_rounds")
      .select("*")
      .eq("match_id", id)
      .order("round_number"),
    supabase
      .from("tag_battle_songs")
      .select("*")
      .eq("match_id", id)
      .order("song_number"),
    supabase
      .from("match_participants")
      .select("id, player_id, team_side")
      .eq("match_id", id),
    supabase
      .from("strategy_card_usages")
      .select("id, team_id, round_label, target_song_id, note")
      .eq("match_id", id),
    getCurrentUser(),
  ]);

  const teamNameById = new Map([
    [match.team_a_id, teamA?.name ?? "?"],
    [match.team_b_id, teamB?.name ?? "?"],
  ]);
  const songLabelById = new Map(
    (songs ?? []).map((s) => [
      s.id,
      `曲${s.song_number}${s.theme ? `　${s.theme}` : ""}`,
    ]),
  );

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

  const marginBetTypes = await getBetTypesWithOptions(supabase, {
    matchId: id,
  });

  const roundList = rounds ?? [];
  const songsByRoundId = new Map<string, NonNullable<typeof songs>>();
  for (const song of songs ?? []) {
    if (!song.round_id) continue;
    const list = songsByRoundId.get(song.round_id) ?? [];
    list.push(song);
    songsByRoundId.set(song.round_id, list);
  }

  const roundBetTypesList = await Promise.all(
    roundList.map((round) => getBetTypesWithOptions(supabase, { roundId: round.id })),
  );
  const roundSongBetTypesByRoundId = new Map<
    string,
    Awaited<ReturnType<typeof getBetTypesWithOptions>>[]
  >();
  for (const round of roundList) {
    const roundSongs = songsByRoundId.get(round.id) ?? [];
    const songBetTypesList = await Promise.all(
      roundSongs.map((song) => getBetTypesWithOptions(supabase, { songId: song.id })),
    );
    roundSongBetTypesByRoundId.set(round.id, songBetTypesList);
  }

  const tabs: BettingTab[] = [
    {
      key: "margin",
      label: "点差予想",
      content: (
        <>
          {marginBetTypes.map((betType) => (
            <div key={betType.id} className="card-surface p-4 sm:p-5">
              <p className="mb-2 font-semibold text-foreground">{betType.label}</p>
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
        </>
      ),
    },
    ...roundList.map((round, index) => {
      const roundSongs = songsByRoundId.get(round.id) ?? [];
      const songBetTypesList = roundSongBetTypesByRoundId.get(round.id) ?? [];
      const playerAName = playerNameById.get(round.player_a_id ?? "") ?? "?";
      const playerBName = playerNameById.get(round.player_b_id ?? "") ?? "?";
      const playerA2Name = round.player_a2_id
        ? (playerNameById.get(round.player_a2_id) ?? "?")
        : null;
      const playerB2Name = round.player_b2_id
        ? (playerNameById.get(round.player_b2_id) ?? "?")
        : null;

      return {
        key: round.id,
        label: `${round.round_label}予想`,
        content: (
          <>
            <div className="card-surface p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold text-foreground">
                  {playerAName}
                  {playerA2Name && ` / ${playerA2Name}`}
                  <span className="text-muted"> vs </span>
                  {playerBName}
                  {playerB2Name && ` / ${playerB2Name}`}
                </p>
                <RoundRealtimeStatus roundId={round.id} initialStatus={round.status} />
              </div>
              <p className="mb-2 text-xs text-muted">
                {ROUND_FORMAT_LABEL_JA[round.round_format]}
                {round.theme && `　${round.theme}`}
                {round.level_range && `（Lv.${round.level_range}）`}
              </p>
            </div>

            {roundBetTypesList[index].map((betType) => (
              <div key={betType.id} className="card-surface p-4 sm:p-5">
                <p className="mb-2 font-semibold text-foreground">{betType.label}</p>
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

            {roundSongs.map((song, songIndex) => (
              <div key={song.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">
                    {songLabelById.get(song.id) ??
                      (song.song_number === 1 ? "Aチーム選曲" : "Bチーム選曲")}
                  </p>
                  <SongRealtimeStatus songId={song.id} initialStatus={song.status} />
                </div>
                {songBetTypesList[songIndex].map((betType) => (
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
          </>
        ),
      };
    }),
  ];

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

        {(strategyCardUsages ?? []).length > 0 && (
          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">
              ストラテジーカード使用
            </p>
            <ul className="flex flex-col gap-1 text-sm text-muted">
              {(strategyCardUsages ?? []).map((usage) => (
                <li key={usage.id}>
                  {teamNameById.get(usage.team_id) ?? "?"}（{usage.round_label}）
                  {usage.target_song_id &&
                    ` — ${songLabelById.get(usage.target_song_id) ?? ""}`}
                  {usage.note && ` / ${usage.note}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <MatchBettingTabs tabs={tabs} />
    </main>
  );
}
