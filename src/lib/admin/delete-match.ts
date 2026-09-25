import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getMatchScopeIds } from "@/lib/admin/get-match-bet-option-ids";
import {
  deleteBetsForOptions,
  voidPendingBetsForOptions,
} from "@/lib/admin/void-pending-bets";

export interface DeleteMatchResult {
  blocked: boolean;
  settledCount: number;
}

// 試合(matches)1件を、配下のラウンド・曲・ベット・出場登録・
// ストラテジーカード使用記録ごと削除する。pending中の賭けは返金してから削除。
// 精算済み(won/lost)が残る場合はforce=trueが無ければ削除をブロックする。
export async function deleteMatch(
  supabase: SupabaseClient<Database>,
  matchId: string,
  force: boolean,
): Promise<DeleteMatchResult> {
  const { roundIds, songIds, betTypeIds, betOptionIds } =
    await getMatchScopeIds(supabase, matchId);

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
      .in("id", betOptionIds);
    if (error) {
      throw new Error(`ベット選択肢の削除に失敗しました: ${error.message}`);
    }
  }
  if (betTypeIds.length > 0) {
    const { error } = await supabase
      .from("bet_types")
      .delete()
      .in("id", betTypeIds);
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
  }

  const { error: strategyCardError } = await supabase
    .from("strategy_card_usages")
    .delete()
    .eq("match_id", matchId);
  if (strategyCardError) {
    throw new Error(
      `ストラテジーカード使用記録の削除に失敗しました: ${strategyCardError.message}`,
    );
  }

  const { error: songsError } = await supabase
    .from("tag_battle_songs")
    .delete()
    .eq("match_id", matchId);
  if (songsError) {
    throw new Error(`曲の削除に失敗しました: ${songsError.message}`);
  }

  if (roundIds.length > 0) {
    const { error } = await supabase
      .from("match_rounds")
      .delete()
      .in("id", roundIds);
    if (error) {
      throw new Error(`ラウンドの削除に失敗しました: ${error.message}`);
    }
  }

  const { error: participantsError } = await supabase
    .from("match_participants")
    .delete()
    .eq("match_id", matchId);
  if (participantsError) {
    throw new Error(
      `出場選手の削除に失敗しました: ${participantsError.message}`,
    );
  }

  const { error: matchError } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId);
  if (matchError) {
    throw new Error(`試合の削除に失敗しました: ${matchError.message}`);
  }

  return { blocked: false, settledCount: 0 };
}
