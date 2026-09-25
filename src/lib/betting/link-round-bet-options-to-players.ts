import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// シングル/メガミックス形式（side毎に選手が1人）のラウンドのみ、
// ラウンド単位のbet_optionsに対応する選手のplayer_idを設定する
// （エールポイントの対象特定のため）。タッグ形式（2v2）は個人の勝敗に
// 定まらないため呼び出し側でスキップする。
export async function linkRoundBetOptionsToPlayers(
  supabase: SupabaseClient<Database>,
  roundId: string,
  playerAId: string,
  playerBId: string,
): Promise<void> {
  const { data: betTypes, error: betTypesError } = await supabase
    .from("bet_types")
    .select("id")
    .eq("round_id", roundId);

  if (betTypesError) {
    throw new Error(`ベット種別の取得に失敗しました: ${betTypesError.message}`);
  }

  const betTypeIds = betTypes.map((betType) => betType.id);
  if (betTypeIds.length === 0) {
    return;
  }

  const { error: updateAError } = await supabase
    .from("bet_options")
    .update({ player_id: playerAId })
    .in("bet_type_id", betTypeIds)
    .eq("side", "a");

  if (updateAError) {
    throw new Error(`選手紐付けに失敗しました: ${updateAError.message}`);
  }

  const { error: updateBError } = await supabase
    .from("bet_options")
    .update({ player_id: playerBId })
    .in("bet_type_id", betTypeIds)
    .eq("side", "b");

  if (updateBError) {
    throw new Error(`選手紐付けに失敗しました: ${updateBError.message}`);
  }
}
