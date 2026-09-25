import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, GameTitle, RoundFormat } from "@/types/database";
import { ensureMatchParticipant } from "@/lib/admin/ensure-match-participant";
import { buildRoundLevelBetTypeDef } from "@/lib/betting/match-format";
import { buildTrifectaBetOptions } from "@/lib/betting/bet-option-builders";
import { resolveTeamIdBySide } from "@/lib/betting/side-to-team";
import { linkRoundBetOptionsToPlayers } from "@/lib/betting/link-round-bet-options-to-players";

export interface CreateMatchRoundParams {
  matchId: string;
  gameTitle: GameTitle;
  teamAId: string;
  teamBId: string;
  roundNumber: number;
  roundLabel: string;
  roundFormat: RoundFormat;
  theme: string | null;
  levelRange: string | null;
  playerAName: string;
  playerBName: string;
  playerA2Name: string | null;
  playerB2Name: string | null;
}

const SONG_SIDE_LABEL: Record<1 | 2, string> = {
  1: "Aチーム選曲",
  2: "Bチーム選曲",
};

// 対戦カード表1行分（1つのマッチ/ラウンド）を登録する共通ロジック。
// 一括インポートと個別ラウンド追加APIの両方から呼ばれる。
export async function createMatchRound(
  supabase: SupabaseClient<Database>,
  params: CreateMatchRoundParams,
): Promise<{ roundId: string }> {
  const {
    matchId,
    gameTitle,
    teamAId,
    teamBId,
    roundNumber,
    roundLabel,
    roundFormat,
    theme,
    levelRange,
    playerAName,
    playerBName,
    playerA2Name,
    playerB2Name,
  } = params;

  const { playerId: playerAId, participantId: participantAId } =
    await ensureMatchParticipant(
      supabase,
      matchId,
      gameTitle,
      playerAName,
      teamAId,
      "a",
    );
  const { playerId: playerBId, participantId: participantBId } =
    await ensureMatchParticipant(
      supabase,
      matchId,
      gameTitle,
      playerBName,
      teamBId,
      "b",
    );

  let playerA2Id: string | null = null;
  let playerB2Id: string | null = null;
  let participantA2Id: string | null = null;
  let participantB2Id: string | null = null;

  if (roundFormat === "tag") {
    if (!playerA2Name || !playerB2Name) {
      throw new Error(
        `${roundLabel}: タッグバトルには選手A2/選手B2の指定が必要です`,
      );
    }
    const resultA2 = await ensureMatchParticipant(
      supabase,
      matchId,
      gameTitle,
      playerA2Name,
      teamAId,
      "a",
    );
    const resultB2 = await ensureMatchParticipant(
      supabase,
      matchId,
      gameTitle,
      playerB2Name,
      teamBId,
      "b",
    );
    playerA2Id = resultA2.playerId;
    playerB2Id = resultB2.playerId;
    participantA2Id = resultA2.participantId;
    participantB2Id = resultB2.participantId;
  }

  const { data: round, error: roundError } = await supabase
    .from("match_rounds")
    .insert({
      match_id: matchId,
      round_number: roundNumber,
      round_label: roundLabel,
      round_format: roundFormat,
      theme,
      level_range: levelRange,
      player_a_id: playerAId,
      player_b_id: playerBId,
      player_a2_id: playerA2Id,
      player_b2_id: playerB2Id,
    })
    .select("id")
    .single();

  if (roundError || !round) {
    throw new Error(
      `${roundLabel}の作成に失敗しました: ${roundError?.message ?? "unknown error"}`,
    );
  }

  const betTypeDef = buildRoundLevelBetTypeDef(roundFormat, roundLabel);
  const { data: betType, error: betTypeError } = await supabase
    .from("bet_types")
    .insert({
      round_id: round.id,
      type_key: betTypeDef.typeKey,
      label: betTypeDef.label,
    })
    .select("id")
    .single();

  if (betTypeError || !betType) {
    throw new Error(
      `${roundLabel}のベット種別作成に失敗しました: ${betTypeError?.message ?? "unknown error"}`,
    );
  }

  const { error: optionsError } = await supabase.from("bet_options").insert(
    betTypeDef.options.map((option) => ({
      bet_type_id: betType.id,
      option_key: option.optionKey,
      label: option.label,
      min_diff: option.minDiff,
      max_diff: option.maxDiff,
      side: option.side,
      team_id: resolveTeamIdBySide(option.side, teamAId, teamBId),
    })),
  );

  if (optionsError) {
    throw new Error(
      `${roundLabel}のベット選択肢作成に失敗しました: ${optionsError.message}`,
    );
  }

  if (roundFormat !== "tag") {
    await linkRoundBetOptionsToPlayers(supabase, round.id, playerAId, playerBId);
  }

  if (roundFormat === "tag") {
    const trifectaParticipants = [
      { id: participantAId, name: playerAName },
      { id: participantBId, name: playerBName },
      { id: participantA2Id!, name: playerA2Name! },
      { id: participantB2Id!, name: playerB2Name! },
    ];

    for (const songNumber of [1, 2] as const) {
      const { data: song, error: songError } = await supabase
        .from("tag_battle_songs")
        .insert({
          match_id: matchId,
          round_id: round.id,
          song_number: songNumber,
        })
        .select("id")
        .single();

      if (songError || !song) {
        throw new Error(
          `${roundLabel}の曲登録に失敗しました: ${songError?.message ?? "unknown error"}`,
        );
      }

      const { data: songBetType, error: songBetTypeError } = await supabase
        .from("bet_types")
        .insert({
          song_id: song.id,
          type_key: "trifecta",
          label: `${SONG_SIDE_LABEL[songNumber]} 3連単`,
        })
        .select("id")
        .single();

      if (songBetTypeError || !songBetType) {
        throw new Error(
          `${roundLabel}の3連単ベット種別作成に失敗しました: ${songBetTypeError?.message ?? "unknown error"}`,
        );
      }

      const trifectaOptions = buildTrifectaBetOptions(trifectaParticipants);
      const { error: trifectaOptionsError } = await supabase
        .from("bet_options")
        .insert(
          trifectaOptions.map((option) => ({
            bet_type_id: songBetType.id,
            option_key: option.optionKey,
            label: option.label,
            min_diff: option.minDiff,
            max_diff: option.maxDiff,
            side: option.side,
          })),
        );

      if (trifectaOptionsError) {
        throw new Error(
          `${roundLabel}の3連単選択肢作成に失敗しました: ${trifectaOptionsError.message}`,
        );
      }
    }
  }

  return { roundId: round.id };
}
