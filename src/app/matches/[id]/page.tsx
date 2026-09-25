import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getBetsForOptionIds } from "@/lib/betting/get-bets-for-options";
import { calculateApproximateOdds } from "@/lib/betting/pari-mutuel";
import { isBetTypeOpen } from "@/lib/betting/bet-type-target-status";
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
import type { BetType } from "@/lib/betting/get-bet-types-with-options";

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

  const allBets = await getBetsForOptionIds(supabase, allOptionIds);
  const oddsList = calculateApproximateOdds(
    allBets.map((b) => ({ optionId: b.optionId, amount: b.amount })),
    allOptionIds,
  );
  const oddsByOptionId = new Map(oddsList.map((o) => [o.optionId, o.rate]));

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

  function toOptionViewModels(
    options: { id: string; label: string }[],
  ): BetOptionViewModel[] {
    return options.map((o) => ({
      id: o.id,
      label: o.label,
      odds: oddsByOptionId.get(o.id) ?? null,
      myBetAmount: myBetAmountByOptionId.get(o.id) ?? null,
    }));
  }

  function toTrifectaOptionViewModels(
    options: { id: string; option_key: string }[],
  ): TrifectaOptionViewModel[] {
    return options.map((o) => ({
      id: o.id,
      optionKey: o.option_key,
      odds: oddsByOptionId.get(o.id) ?? null,
      myBetAmount: myBetAmountByOptionId.get(o.id) ?? null,
    }));
  }

  const tabs: TabItem[] = [
    {
      key: "margin",
      label: "点差予想",
      content: (
        <>
          {marginBetTypes.map((betType) => (
            <BetTypePanel
              key={betType.id}
              betTypeId={betType.id}
              betTypeLabel={betType.label}
              options={toOptionViewModels(betType.options)}
              isLoggedIn={!!user}
              isClosed={!isBetTypeOpen({ matchStatus: match.status })}
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
        (p) => ({ id: p.id, name: playerNameById.get(p.player_id) ?? "?" }),
      );

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
              <BetTypePanel
                key={betType.id}
                betTypeId={betType.id}
                betTypeLabel={betType.label}
                options={toOptionViewModels(betType.options)}
                isLoggedIn={!!user}
                isClosed={!isBetTypeOpen({ roundStatus: round.status })}
              />
            ))}

            {roundSongs.length > 0 && (
              <Tabs
                tabs={roundSongs.map((song, songIndex) => ({
                  key: song.id,
                  label: songLabelById.get(song.id) ?? `曲${song.song_number}`,
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
                            betTypeLabel={betType.label}
                            participants={trifectaParticipants}
                            options={toTrifectaOptionViewModels(betType.options)}
                            isLoggedIn={!!user}
                            isClosed={!isBetTypeOpen({ songStatus: song.status })}
                          />
                        ) : (
                          <BetTypePanel
                            key={betType.id}
                            betTypeId={betType.id}
                            betTypeLabel={betType.label}
                            options={toOptionViewModels(betType.options)}
                            isLoggedIn={!!user}
                            isClosed={!isBetTypeOpen({ songStatus: song.status })}
                          />
                        ),
                      )}
                    </>
                  ),
                }))}
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
        <span className="mb-2 inline-block rounded-full border border-accent-purple/40 bg-accent-purple/15 px-2 py-0.5 text-xs font-semibold text-accent-purple">
          {match.game_title.toUpperCase()}
        </span>
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

      <Tabs tabs={tabs} />
    </main>
  );
}
