import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// 指定したbet_option群に紐づくpending中の賭けを返金し、payout_statusをvoidedにする。
// 既に精算済み（won/lost）の賭けが残っている件数を返すので、
// 呼び出し側はforceフラグ等で削除続行の可否を判断する。
export async function voidPendingBetsForOptions(
  supabase: SupabaseClient<Database>,
  betOptionIds: string[],
): Promise<{ settledCount: number }> {
  if (betOptionIds.length === 0) {
    return { settledCount: 0 };
  }

  const { data: pendingBets, error: pendingError } = await supabase
    .from("bets")
    .select("id, user_id, amount")
    .in("bet_option_id", betOptionIds)
    .eq("payout_status", "pending");

  if (pendingError) {
    throw new Error(`賭けの取得に失敗しました: ${pendingError.message}`);
  }

  for (const bet of pendingBets) {
    const { data: userRow, error: userFetchError } = await supabase
      .from("users")
      .select("coins")
      .eq("id", bet.user_id)
      .single();

    if (userFetchError || !userRow) {
      throw new Error("返金対象ユーザーの取得に失敗しました");
    }

    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ coins: userRow.coins + bet.amount })
      .eq("id", bet.user_id);

    if (userUpdateError) {
      throw new Error(`コインの返金に失敗しました: ${userUpdateError.message}`);
    }

    const { error: coinLogError } = await supabase.from("coin_logs").insert({
      user_id: bet.user_id,
      type: "admin_adjust",
      amount: bet.amount,
    });

    if (coinLogError) {
      throw new Error(
        `コイン履歴の記録に失敗しました: ${coinLogError.message}`,
      );
    }

    const { error: voidError } = await supabase
      .from("bets")
      .update({ payout_status: "voided" })
      .eq("id", bet.id);

    if (voidError) {
      throw new Error(`賭けの取消記録に失敗しました: ${voidError.message}`);
    }
  }

  const { count: settledCount, error: settledError } = await supabase
    .from("bets")
    .select("id", { count: "exact", head: true })
    .in("bet_option_id", betOptionIds)
    .in("payout_status", ["won", "lost"]);

  if (settledError) {
    throw new Error(`精算済み賭けの確認に失敗しました: ${settledError.message}`);
  }

  return { settledCount: settledCount ?? 0 };
}

// 指定したbet_option群に紐づく全bets（voided/won/lost含む）を明示的に削除する。
// force=true時、settled分の削除前に呼ぶ。
export async function deleteBetsForOptions(
  supabase: SupabaseClient<Database>,
  betOptionIds: string[],
): Promise<void> {
  if (betOptionIds.length === 0) {
    return;
  }
  const { error } = await supabase
    .from("bets")
    .delete()
    .in("bet_option_id", betOptionIds);

  if (error) {
    throw new Error(`賭け履歴の削除に失敗しました: ${error.message}`);
  }
}
