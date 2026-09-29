import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";
import { getBetsForOptionIds } from "@/lib/betting/get-bets-for-options";
import { calculateApproximateOdds } from "@/lib/betting/pari-mutuel";
import { MatchStatusButtons } from "@/components/admin/match-status-buttons";
import { AddRoundForm } from "@/components/admin/add-round-form";
import { RoundPanel } from "@/components/admin/round-panel";
import { BetTypeSettlePanel } from "@/components/admin/bet-type-settle-panel";
import { StatusBadge } from "@/components/status-badge";
import { StrategyCardPanel } from "@/components/admin/strategy-card-panel";
import { STRATEGY_CARD_LIMIT_PER_TEAM } from "@/lib/betting/strategy-cards";
import { EditMatchToggle } from "@/components/admin/edit-match-toggle";
import { DeleteMatchButton } from "@/components/admin/delete-match-button";
import { MatchTeamHeader } from "@/components/match-team-header";
import { formatGameLabel } from "@/lib/betting/format-game-label";

const STEP_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">管理者権限が必要です。</p>
      </main>
    );
  }

  const { id: matchId } = await params;
  const supabase = createServiceClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) {
    notFound();
  }

  const [
    { data: participants },
    { data: players },
    { data: songs },
    { data: rounds },
    { data: teamA },
    { data: teamB },
    { data: allTeams },
    { data: matchUsages },
  ] = await Promise.all([
    supabase
      .from("match_participants")
      .select("id, player_id, team_side")
      .eq("match_id", matchId),
    supabase
      .from("players")
      .select("id, name")
      .eq("game_title", match.game_title)
      .order("name"),
    supabase
      .from("tag_battle_songs")
      .select("*")
      .eq("match_id", matchId)
      .order("song_number"),
    supabase
      .from("match_rounds")
      .select("*")
      .eq("match_id", matchId)
      .order("round_number"),
    supabase
      .from("teams")
      .select("id, name, color")
      .eq("id", match.team_a_id)
      .single(),
    supabase
      .from("teams")
      .select("id, name, color")
      .eq("id", match.team_b_id)
      .single(),
    supabase
      .from("teams")
      .select("id, name, game_title")
      .eq("game_title", match.game_title)
      .order("name"),
    supabase
      .from("strategy_card_usages")
      .select("id, team_id, round_label, target_song_id, note")
      .eq("match_id", matchId),
  ]);

  const [{ count: teamAUsedCount }, { count: teamBUsedCount }] =
    await Promise.all([
      supabase
        .from("strategy_card_usages")
        .select("id", { count: "exact", head: true })
        .eq("team_id", match.team_a_id),
      supabase
        .from("strategy_card_usages")
        .select("id", { count: "exact", head: true })
        .eq("team_id", match.team_b_id),
    ]);

  const matchBetTypes = await getBetTypesWithOptions(supabase, {
    matchId,
  });

  // 試合単位のベットにオッズを付加（bet_type単位で独立して算出）
  const matchBetOptionIds = matchBetTypes.flatMap((bt) => bt.options.map((o) => o.id));
  const matchBets = await getBetsForOptionIds(supabase, matchBetOptionIds);
  const matchBetTypesWithOdds = matchBetTypes.map((betType) => {
    const optionIds = betType.options.map((o) => o.id);
    const relevantBets = matchBets
      .filter((b) => optionIds.includes(b.optionId))
      .map((b) => ({ optionId: b.optionId, amount: b.amount }));
    const odds = calculateApproximateOdds(relevantBets, optionIds);
    const oddsByOptionId = new Map(odds.map((o) => [o.optionId, o]));
    return {
      ...betType,
      options: betType.options.map((o) => ({
        ...o,
        odds: oddsByOptionId.get(o.id)?.rate ?? null,
        poolAmount: oddsByOptionId.get(o.id)?.poolAmount ?? 0,
      })),
    };
  });

  const playerNameById = new Map((players ?? []).map((p) => [p.id, p.name]));
  const participantList = (participants ?? []).map((p) => ({
    ...p,
    playerName: playerNameById.get(p.player_id) ?? p.player_id,
  }));

  const teamNameById = new Map(
    [teamA, teamB]
      .filter((t): t is { id: string; name: string; color: string | null } => !!t)
      .map((t) => [t.id, t.name]),
  );
  const songLabelById = new Map(
    (songs ?? []).map((s) => [
      s.id,
      `曲${s.song_number}${s.theme ? `　${s.theme}` : ""}`,
    ]),
  );

  const teamAName = teamNameById.get(match.team_a_id) ?? "?";
  const teamBName = teamNameById.get(match.team_b_id) ?? "?";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="card-surface mb-6 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold text-foreground">
            {match.game_title.toUpperCase()} 試合詳細
            {formatGameLabel(match.game_key) && (
              <span className="ml-2 text-sm font-normal text-muted">
                {formatGameLabel(match.game_key)}
              </span>
            )}
          </h1>
          <div className="flex items-start gap-2">
            <EditMatchToggle
              matchId={match.id}
              teams={allTeams ?? []}
              initialTeamAId={match.team_a_id}
              initialTeamBId={match.team_b_id}
              initialStartTime={match.start_time}
            />
            <DeleteMatchButton matchId={match.id} />
          </div>
        </div>
        <p className="mb-3 flex items-center gap-2 text-sm text-muted">
          開始: {new Date(match.start_time).toLocaleString("ja-JP")}
          <StatusBadge status={match.status} />
        </p>
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
          size="sm"
        />
      </div>

      <div className="flex flex-col gap-6">
        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-accent-purple">
            <span className="text-base">{STEP_NUMBERS[0]}</span>
            試合単位ベット（点差予想）
            <span className="font-normal text-muted">
              ※締切タイミングが一番早いのでここで先に締切ってください
            </span>
          </h2>
          <div className="flex flex-col gap-4">
            <MatchStatusButtons
              matchId={match.id}
              currentStatus={match.status}
              teamAId={match.team_a_id}
              teamAName={teamAName}
              teamBId={match.team_b_id}
              teamBName={teamBName}
              currentWinnerTeamId={match.winner_team_id}
            />
            {matchBetTypesWithOdds.map((betType) => (
              <BetTypeSettlePanel key={betType.id} betType={betType} />
            ))}
            {matchBetTypesWithOdds.length === 0 && (
              <p className="text-sm text-muted">
                この対戦形式では試合単位のベットはありません（曲単位のベットのみ）
              </p>
            )}
          </div>
        </section>

        {(rounds ?? []).map((round, index) => (
          <RoundPanel
            key={round.id}
            round={round}
            participants={participantList}
            teamAName={teamAName}
            teamBName={teamBName}
            stepLabel={STEP_NUMBERS[index + 1] ?? "・"}
          />
        ))}

        <AddRoundForm matchId={match.id} />

        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            ストラテジーカード
          </h2>
          <StrategyCardPanel
            matchId={match.id}
            gameTitle={match.game_title}
            teams={[
              {
                id: match.team_a_id,
                name: teamAName,
                side: "a",
                usedCount: teamAUsedCount ?? 0,
                limit: STRATEGY_CARD_LIMIT_PER_TEAM,
              },
              {
                id: match.team_b_id,
                name: teamBName,
                side: "b",
                usedCount: teamBUsedCount ?? 0,
                limit: STRATEGY_CARD_LIMIT_PER_TEAM,
              },
            ]}
            songs={(songs ?? []).map((s) => ({
              id: s.id,
              label: songLabelById.get(s.id) ?? `曲${s.song_number}`,
            }))}
            usages={(matchUsages ?? []).map((u) => ({
              id: u.id,
              teamId: u.team_id,
              teamName: teamNameById.get(u.team_id) ?? "?",
              roundLabel: u.round_label,
              targetSongLabel: u.target_song_id
                ? (songLabelById.get(u.target_song_id) ?? null)
                : null,
              note: u.note,
            }))}
          />
        </section>
      </div>
    </main>
  );
}
