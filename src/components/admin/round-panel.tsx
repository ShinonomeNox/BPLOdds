import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";
import { getBetsForOptionIds } from "@/lib/betting/get-bets-for-options";
import { calculateApproximateOdds } from "@/lib/betting/pari-mutuel";
import { RoundStatusButtons } from "@/components/admin/round-status-buttons";
import { BetTypeSettlePanel } from "@/components/admin/bet-type-settle-panel";
import { SongPanel } from "@/components/admin/song-panel";
import { DeleteRoundButton } from "@/components/admin/delete-round-button";
import { Tabs, type TabItem } from "@/components/tabs";
import { ROUND_FORMAT_LABEL_JA } from "@/lib/betting/match-format";
import type { MatchStatus, RoundFormat } from "@/types/database";

interface MatchRound {
  id: string;
  round_number: number;
  round_label: string;
  round_format: RoundFormat;
  theme: string | null;
  level_range: string | null;
  status: MatchStatus;
  player_a_id: string | null;
  player_b_id: string | null;
  player_a2_id: string | null;
  player_b2_id: string | null;
}

interface ParticipantWithPlayer {
  id: string;
  player_id: string;
  team_side: string;
  playerName: string;
}

export async function RoundPanel({
  round,
  participants,
  teamAName,
  teamBName,
}: {
  round: MatchRound;
  participants: ParticipantWithPlayer[];
  teamAName: string;
  teamBName: string;
}) {
  const supabase = createServiceClient();
  const betTypes = await getBetTypesWithOptions(supabase, { roundId: round.id });

  const betOptionIds = betTypes.flatMap((bt) => bt.options.map((o) => o.id));
  const roundBets = await getBetsForOptionIds(supabase, betOptionIds);
  const betTypesWithOdds = betTypes.map((betType) => {
    const optionIds = betType.options.map((o) => o.id);
    const relevantBets = roundBets
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

  const roundPlayerIds = [
    round.player_a_id,
    round.player_b_id,
    round.player_a2_id,
    round.player_b2_id,
  ].filter((id): id is string => !!id);
  const roundParticipants = participants.filter((p) =>
    roundPlayerIds.includes(p.player_id),
  );

  const { data: songs } = await supabase
    .from("tag_battle_songs")
    .select("*")
    .eq("round_id", round.id)
    .order("song_number");

  const playerAName =
    roundParticipants.find((p) => p.player_id === round.player_a_id)
      ?.playerName ?? "?";
  const playerBName =
    roundParticipants.find((p) => p.player_id === round.player_b_id)
      ?.playerName ?? "?";
  const playerA2Name = round.player_a2_id
    ? (roundParticipants.find((p) => p.player_id === round.player_a2_id)
        ?.playerName ?? "?")
    : null;
  const playerB2Name = round.player_b2_id
    ? (roundParticipants.find((p) => p.player_id === round.player_b2_id)
        ?.playerName ?? "?")
    : null;

  return (
    <div className="card-surface flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {round.round_label}
            <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
              {ROUND_FORMAT_LABEL_JA[round.round_format]}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {playerAName}
            {playerA2Name && ` / ${playerA2Name}`} vs {playerBName}
            {playerB2Name && ` / ${playerB2Name}`}
          </p>
          {(round.theme || round.level_range) && (
            <p className="text-xs text-muted">
              {round.theme}
              {round.level_range && `（Lv.${round.level_range}）`}
            </p>
          )}
        </div>
        <DeleteRoundButton roundId={round.id} />
      </div>

      <RoundStatusButtons roundId={round.id} currentStatus={round.status} />

      {betTypesWithOdds.map((betType) => (
        <BetTypeSettlePanel key={betType.id} betType={betType} />
      ))}

      {round.round_format === "tag_trifecta" && (songs ?? []).length > 0 && (
        <Tabs
          tabs={(songs ?? []).map(
            (song): TabItem => ({
              key: song.id,
              label: song.song_number === 1 ? teamAName : teamBName,
              content: (
                <SongPanel
                  song={song}
                  participants={roundParticipants}
                  teamAName={teamAName}
                  teamBName={teamBName}
                />
              ),
            }),
          )}
        />
      )}
    </div>
  );
}
