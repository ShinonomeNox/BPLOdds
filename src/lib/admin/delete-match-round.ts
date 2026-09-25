import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  deleteBetsForOptions,
  voidPendingBetsForOptions,
} from "@/lib/admin/void-pending-bets";

export interface DeleteMatchRoundResult {
  blocked: boolean;
  settledCount: number;
}

// ラウンド（match_rounds）1件を、配下のベット・曲・出場登録ごと削除する。
// pending中の賭けは返金してから削除。精算済み(won/lost)が残る場合は
// force=trueが無ければ削除をブロックする。
export async function deleteMatchRound(
  supabase: SupabaseClient<Database>,
  roundId: string,
  force: boolean,
): Promise<DeleteMatchRoundResult> {
  const { data: songs, error: songsError } = await supabase
    .from("tag_battle_songs")
    .select("id")
    .eq("round_id", roundId);

  if (songsError) {
    throw new Error(`曲情報の取得に失敗しました: ${songsError.message}`);
  }
  const songIds = songs.map((s) => s.id);

  const { data: roundBetTypes, error: roundBetTypesError } = await supabase
    .from("bet_types")
    .select("id")
    .eq("round_id", roundId);
  if (roundBetTypesError) {
    throw new Error(
      `ベット種別の取得に失敗しました: ${roundBetTypesError.message}`,
    );
  }

  const { data: songBetTypes, error: songBetTypesError } =
    songIds.length > 0
      ? await supabase.from("bet_types").select("id").in("song_id", songIds)
      : { data: [], error: null };
  if (songBetTypesError) {
    throw new Error(
      `曲ベット種別の取得に失敗しました: ${songBetTypesError.message}`,
    );
  }

  const allBetTypeIds = [
    ...roundBetTypes.map((b) => b.id),
    ...(songBetTypes ?? []).map((b) => b.id),
  ];

  const { data: betOptions, error: betOptionsError } =
    allBetTypeIds.length > 0
      ? await supabase
          .from("bet_options")
          .select("id")
          .in("bet_type_id", allBetTypeIds)
      : { data: [], error: null };
  if (betOptionsError) {
    throw new Error(
      `ベット選択肢の取得に失敗しました: ${betOptionsError.message}`,
    );
  }
  const betOptionIds = (betOptions ?? []).map((o) => o.id);

  const { settledCount } = await voidPendingBetsForOptions(
    supabase,
    betOptionIds,
  );
  if (settledCount > 0 && !force) {
    return { blocked: true, settledCount };
  }
  if (settledCount > 0 && force) {
    await deleteBetsForOptions(supabase, betOptionIds);
  }

  if (betOptionIds.length > 0) {
    const { error } = await supabase
      .from("bet_options")
      .delete()
      .in("bet_type_id", allBetTypeIds);
    if (error) {
      throw new Error(`ベット選択肢の削除に失敗しました: ${error.message}`);
    }
  }
  if (allBetTypeIds.length > 0) {
    const { error } = await supabase
      .from("bet_types")
      .delete()
      .in("id", allBetTypeIds);
    if (error) {
      throw new Error(`ベット種別の削除に失敗しました: ${error.message}`);
    }
  }
  if (songIds.length > 0) {
    const { error: resultsError } = await supabase
      .from("song_results")
      .delete()
      .in("song_id", songIds);
    if (resultsError) {
      throw new Error(`曲結果の削除に失敗しました: ${resultsError.message}`);
    }
    const { error: songsDeleteError } = await supabase
      .from("tag_battle_songs")
      .delete()
      .in("id", songIds);
    if (songsDeleteError) {
      throw new Error(`曲の削除に失敗しました: ${songsDeleteError.message}`);
    }
  }

  const { error: roundDeleteError } = await supabase
    .from("match_rounds")
    .delete()
    .eq("id", roundId);
  if (roundDeleteError) {
    throw new Error(`ラウンドの削除に失敗しました: ${roundDeleteError.message}`);
  }

  return { blocked: false, settledCount: 0 };
}
