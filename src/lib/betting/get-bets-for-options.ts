import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PayoutStatus } from "@/types/database";

export interface OptionBetRow {
  userId: string;
  optionId: string;
  amount: number;
  payoutStatus: PayoutStatus;
  payoutAmount: number | null;
}

// 指定したbet_option群に紐づく全bets（誰が賭けたかも含む）を1回のクエリで取得する。
// オッズ計算（全ユーザー分の合計）にも、自分の賭け表示（user_idでフィルタ）にも同じ結果を使い回す。
export async function getBetsForOptionIds(
  supabase: SupabaseClient<Database>,
  optionIds: readonly string[],
): Promise<OptionBetRow[]> {
  if (optionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("bets")
    .select("user_id, bet_option_id, amount, payout_status, payout_amount")
    .in("bet_option_id", optionIds);

  if (error) {
    throw new Error(`ベット一覧の取得に失敗しました: ${error.message}`);
  }

  return data.map((row) => ({
    userId: row.user_id,
    optionId: row.bet_option_id,
    amount: row.amount,
    payoutStatus: row.payout_status,
    payoutAmount: row.payout_amount,
  }));
}
