import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// シングル戦形式（side毎に選手が1人ずつ）の場合のみ、試合単位のbet_optionsに
// 対応する選手のplayer_idを設定する（エールポイントの勝利ボーナス対象を特定するため）。
// DDRタッグ等、side毎に複数人いる対戦では個人の勝敗に定まらないため何もしない。
export async function linkMatchBetOptionsToPlayers(
  supabase: SupabaseClient<Database>,
  matchId: string,
): Promise<void> {
  const { data: participants, error: participantsError } = await supabase
    .from("match_participants")
    .select("player_id, team_side")
    .eq("match_id", matchId);

  if (participantsError) {
    throw new Error(
      `出場選手の取得に失敗しました: ${participantsError.message}`,
    );
  }

  const sideAPlayers = participants.filter((p) => p.team_side === "a");
  const sideBPlayers = participants.filter((p) => p.team_side === "b");

  if (sideAPlayers.length !== 1 || sideBPlayers.length !== 1) {
    return;
  }

  const { data: betTypes, error: betTypesError } = await supabase
    .from("bet_types")
    .select("id")
    .eq("match_id", matchId);

  if (betTypesError) {
    throw new Error(
      `ベット種別の取得に失敗しました: ${betTypesError.message}`,
    );
  }

  const betTypeIds = betTypes.map((betType) => betType.id);
  if (betTypeIds.length === 0) {
    return;
  }

  const { error: updateAError } = await supabase
    .from("bet_options")
    .update({ player_id: sideAPlayers[0].player_id })
    .in("bet_type_id", betTypeIds)
    .eq("side", "a");

  if (updateAError) {
    throw new Error(`選手紐付けに失敗しました: ${updateAError.message}`);
  }

  const { error: updateBError } = await supabase
    .from("bet_options")
    .update({ player_id: sideBPlayers[0].player_id })
    .in("bet_type_id", betTypeIds)
    .eq("side", "b");

  if (updateBError) {
    throw new Error(`選手紐付けに失敗しました: ${updateBError.message}`);
  }
}
