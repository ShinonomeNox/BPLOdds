import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getBetsForOptionIds } from "@/lib/betting/get-bets-for-options";
import { calculateApproximateOdds, calculateConfirmedRates } from "@/lib/betting/pari-mutuel";
import { isBetTypeOpen } from "@/lib/betting/bet-type-target-status";
import { formatGameLabel } from "@/lib/betting/format-game-label";
import { BetTypePanel, type BetOptionViewModel } from "@/components/bet-type-panel";
import {
  TrifectaBetPanel,
  type TrifectaOptionViewModel,
  type TrifectaParticipantViewModel,
} from "@/components/trifecta-bet-panel";
import { MatchRealtimeStatus } from "@/components/realtime/match-realtime-status";
import { RoundRealtimeStatus } from "@/components/realtime/round-realtime-status";
import { SongRealtimeStatus } from "@/components/realtime/song-realtime-status";
import { Tabs, type TabItem } from "@/components/tabs";
import { ROUND_FORMAT_LABEL_JA } from "@/lib/betting/match-format";
import { MatchTeamHeader } from "@/components/match-team-header";
import { PlayerMatchupHeader } from "@/components/player-matchup-header";
import { MatchPageBody, type MatchupRow } from "@/components/match-page-body";
import type { BetType } from "@/lib/betting/get-bet-types-with-options";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { id } = await params;
  const { round: initialRoundId } = await searchParams;
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
    supabase
      .from("teams")
      .select("name, color")
      .eq("id", match.team_a_id)
      .single(),
    supabase
      .from("teams")
      .select("name, color")
      .eq("id", match.team_b_id)
      .single(),
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
      `${s.song_number === 1 ? (teamA?.name ?? "Aチーム") : (teamB?.name ?? "Bチーム")}の自選曲${s.theme ? `　${s.theme}` : ""}`,
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
  const roundSongBetTypesByRoundId = new Map<string, BetType[][]>();
  for (const round of roundList) {
    const roundSongs = songsByRoundId.get(round.id) ?? [];
    const songBetTypesList = await Promise.all(
      roundSongs.map((song) => getBetTypesWithOptions(supabase, { songId: song.id })),
    );
    roundSongBetTypesByRoundId.set(round.id, songBetTypesList);
  }

  // 全option分のオッズ・自分の賭けを1回のクエリでまとめて算出する
  const allOptionIds: string[] = [];
  for (const bt of marginBetTypes) for (const o of bt.options) allOptionIds.push(o.id);
  for (const list of roundBetTypesList)
    for (const bt of list) for (const o of bt.options) allOptionIds.push(o.id);
  for (const lists of roundSongBetTypesByRoundId.values())
    for (const list of lists)
      for (const bt of list) for (const o of bt.options) allOptionIds.push(o.id);

  // 1回のクエリでbetsを取得しつつ、オッズ計算自体はbet_type（母集団）ごとに
  // 独立して行う必要がある（全体をまとめてtotalPoolにすると無関係な
  // ベット同士でオッズが連動してしまうバグになるため）。
  const allBets = await getBetsForOptionIds(supabase, allOptionIds);
  const betsByOptionId = new Map<string, { amount: number }[]>();
  for (const bet of allBets) {
    const list = betsByOptionId.get(bet.optionId) ?? [];
    list.push({ amount: bet.amount });
    betsByOptionId.set(bet.optionId, list);
  }

  const myBetAmountByOptionId = new Map<string, number>();
  if (user) {
    for (const bet of allBets) {
      if (bet.userId !== user.userId) continue;
      myBetAmountByOptionId.set(
        bet.optionId,
        (myBetAmountByOptionId.get(bet.optionId) ?? 0) + bet.amount,
      );
    }
  }

  function calculateOddsByOptionId(optionIds: string[]): Map<string, number | null> {
    const relevantBets = optionIds.flatMap((optionId) =>
      (betsByOptionId.get(optionId) ?? []).map((b) => ({
        optionId,
        amount: b.amount,
      })),
    );
    const odds = calculateApproximateOdds(relevantBets, optionIds);
    return new Map(odds.map((o) => [o.optionId, o.rate]));
  }

  function calculateConfirmedOddsByOptionId(
    optionIds: string[],
    winnerIds: string[],
  ): Map<string, number> {
    const relevantBets = optionIds.flatMap((optionId) =>
      (betsByOptionId.get(optionId) ?? []).map((b) => ({
        optionId,
        amount: b.amount,
      })),
    );
    return calculateConfirmedRates(relevantBets, winnerIds);
  }

  function toOptionViewModels(
    options: {
      id: string;
      label: string;
      sub_label: string | null;
      side: "a" | "b" | null;
      is_winner: boolean;
    }[],
    isSettled: boolean,
  ): BetOptionViewModel[] {
    const optionIds = options.map((o) => o.id);
    const oddsByOptionId = isSettled
      ? calculateConfirmedOddsByOptionId(
          optionIds,
          options.filter((o) => o.is_winner).map((o) => o.id),
        )
      : calculateOddsByOptionId(optionIds);
    return options.map((o) => ({
      id: o.id,
      label: o.label,
      subLabel: o.sub_label,
      odds: isSettled
        ? o.is_winner
          ? (oddsByOptionId.get(o.id) ?? null)
          : null
        : (oddsByOptionId.get(o.id) ?? null),
      myBetAmount: myBetAmountByOptionId.get(o.id) ?? null,
      side: o.side,
      isWinner: o.is_winner,
    }));
  }

  function toTrifectaOptionViewModels(
    options: { id: string; option_key: string; is_winner: boolean }[],
    isSettled: boolean,
  ): TrifectaOptionViewModel[] {
    const optionIds = options.map((o) => o.id);
    const oddsByOptionId = isSettled
      ? calculateConfirmedOddsByOptionId(
          optionIds,
          options.filter((o) => o.is_winner).map((o) => o.id),
        )
      : calculateOddsByOptionId(optionIds);
    return options.map((o) => ({
      id: o.id,
      optionKey: o.option_key,
      odds: isSettled
        ? o.is_winner
          ? (oddsByOptionId.get(o.id) ?? null)
          : null
        : (oddsByOptionId.get(o.id) ?? null),
      myBetAmount: myBetAmountByOptionId.get(o.id) ?? null,
      isWinner: o.is_winner,
    }));
  }

  const gameLabel = formatGameLabel(match.game_key);

  const matchupRows: MatchupRow[] = roundList.map((round) => ({
    tabKey: round.id,
    roundLabel: round.round_label,
    aName: playerNameById.get(round.player_a_id ?? "") ?? "?",
    aName2: round.player_a2_id ? (playerNameById.get(round.player_a2_id) ?? "?") : null,
    aColor: teamA?.color ?? null,
    bName: playerNameById.get(round.player_b_id ?? "") ?? "?",
    bName2: round.player_b2_id ? (playerNameById.get(round.player_b2_id) ?? "?") : null,
    bColor: teamB?.color ?? null,
  }));

  const isMatchSettled = match.status === "settled";

  const tabs: TabItem[] = [
    {
      key: "margin",
      label: isMatchSettled ? "点差結果" : "点差予想",
      content: (
        <>
          {marginBetTypes.map((betType) => (
            <BetTypePanel
              key={betType.id}
              betTypeId={betType.id}
              betTypeLabel={betType.label}
              options={toOptionViewModels(betType.options, isMatchSettled)}
              isLoggedIn={!!user}
              isClosed={!isBetTypeOpen({ matchStatus: match.status })}
              isSettled={isMatchSettled}
              teamAColor={teamA?.color}
              teamBColor={teamB?.color}
              teamAName={teamA?.name}
              teamBName={teamB?.name}
            />
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

      const roundPlayerIds = [
        round.player_a_id,
        round.player_b_id,
        round.player_a2_id,
        round.player_b2_id,
      ].filter((v): v is string => !!v);
      const roundParticipants = (participants ?? []).filter((p) =>
        roundPlayerIds.includes(p.player_id),
      );
      const trifectaParticipants: TrifectaParticipantViewModel[] = roundParticipants.map(
        (p) => ({
          id: p.id,
          name: playerNameById.get(p.player_id) ?? "?",
          teamColor:
            (p.team_side === "a" ? teamA?.color : teamB?.color) ?? null,
        }),
      );

      const isRoundSettled = round.status === "settled";

      return {
        key: round.id,
        label: `${round.round_label}${isRoundSettled ? "結果" : "予想"}`,
        content: (
          <>
            <div className="card-surface flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-center justify-end">
                <RoundRealtimeStatus roundId={round.id} initialStatus={round.status} />
              </div>
              <PlayerMatchupHeader
                aName={playerAName}
                aName2={playerA2Name}
                aColor={teamA?.color ?? null}
                bName={playerBName}
                bName2={playerB2Name}
                bColor={teamB?.color ?? null}
                centerLabel="VS"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                  {ROUND_FORMAT_LABEL_JA[round.round_format]}
                </span>
                {round.theme && (
                  <span className="glow-text text-base font-bold text-accent-cyan">
                    {round.theme}
                  </span>
                )}
                {round.level_range && (
                  <span className="text-xs text-muted">Lv.{round.level_range}</span>
                )}
              </div>
            </div>

            {roundBetTypesList[index].map((betType) => (
              <BetTypePanel
                key={betType.id}
                betTypeId={betType.id}
                betTypeLabel={betType.label}
                options={toOptionViewModels(betType.options, isRoundSettled)}
                isLoggedIn={!!user}
                isClosed={!isBetTypeOpen({ roundStatus: round.status })}
                isSettled={isRoundSettled}
                teamAColor={teamA?.color}
                teamBColor={teamB?.color}
                teamAName={teamA?.name}
                teamBName={teamB?.name}
              />
            ))}

            {roundSongs.length > 0 && (
              <Tabs
                equalWidth
                tabs={roundSongs.map((song, songIndex) => {
                  const songLabel = songLabelById.get(song.id) ?? `曲${song.song_number}`;
                  const isSongSettled = song.status === "settled";
                  return {
                    key: song.id,
                    label: songLabel,
                    color: song.song_number === 1 ? teamA?.color : teamB?.color,
                    content: (
                      <>
                        <div className="flex items-center justify-end">
                          <SongRealtimeStatus
                            songId={song.id}
                            initialStatus={song.status}
                          />
                        </div>
                        {songBetTypesList[songIndex].map((betType) =>
                          betType.type_key === "trifecta" ? (
                            <TrifectaBetPanel
                              key={betType.id}
                              betTypeId={betType.id}
                              betTypeLabel={`${songLabel} 3連単`}
                              participants={trifectaParticipants}
                              options={toTrifectaOptionViewModels(
                                betType.options,
                                isSongSettled,
                              )}
                              isLoggedIn={!!user}
                              isClosed={!isBetTypeOpen({ songStatus: song.status })}
                              isSettled={isSongSettled}
                            />
                          ) : (
                            <BetTypePanel
                              key={betType.id}
                              betTypeId={betType.id}
                              betTypeLabel={betType.label}
                              options={toOptionViewModels(betType.options, isSongSettled)}
                              isLoggedIn={!!user}
                              isClosed={!isBetTypeOpen({ songStatus: song.status })}
                              isSettled={isSongSettled}
                              teamAColor={teamA?.color}
                              teamBColor={teamB?.color}
                              teamAName={teamA?.name}
                              teamBName={teamB?.name}
                            />
                          ),
                        )}
                      </>
                    ),
                  };
                })}
              />
            )}
          </>
        ),
      };
    }),
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="card-surface mb-6 p-5 sm:p-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-block rounded-full border border-accent-purple/40 bg-accent-purple/15 px-2 py-0.5 text-xs font-semibold text-accent-purple">
            {match.game_title.toUpperCase()}
          </span>
          {gameLabel && (
            <span className="text-xs font-semibold text-muted">{gameLabel}</span>
          )}
        </div>
        <MatchTeamHeader
          teamA={{
            id: match.team_a_id,
            name: teamA?.name ?? "?",
            color: teamA?.color ?? null,
          }}
          teamB={{
            id: match.team_b_id,
            name: teamB?.name ?? "?",
            color: teamB?.color ?? null,
          }}
          size="lg"
        />
        <p className="mt-2 text-sm text-muted">
          {new Date(match.start_time).toLocaleString("ja-JP")}
        </p>
        <div className="mt-3">
          <MatchRealtimeStatus matchId={match.id} initialStatus={match.status} />
        </div>

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

      <MatchPageBody
        matchupRows={matchupRows}
        tabs={tabs}
        initialActiveKey={initialRoundId}
      />
    </main>
  );
}
