import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  calculatePariMutuelRates,
  calculatePayout,
} from "@/lib/betting/pari-mutuel";
import {
  addTeamYellPoints,
  addYellPoints,
  getYellBonusRate,
} from "@/lib/betting/yell-points";

export interface SettleBetTypeResult {
  settledBetCount: number;
  refunded: boolean;
}

export async function settleBetType(
  supabase: SupabaseClient<Database>,
  betTypeId: string,
  winningOptionIds: string[],
): Promise<SettleBetTypeResult> {
  const { data: options, error: optionsError } = await supabase
    .from("bet_options")
    .select("id, player_id, team_id")
    .eq("bet_type_id", betTypeId);

  if (optionsError) {
    throw new Error(
      `ベット選択肢の取得に失敗しました: ${optionsError.message}`,
    );
  }
  if (options.length === 0) {
    throw new Error("このベット種別には選択肢がありません");
  }

  const optionIds = options.map((option) => option.id);
  const playerIdByOptionId = new Map(
    options.map((option) => [option.id, option.player_id]),
  );
  const teamIdByOptionId = new Map(
    options.map((option) => [option.id, option.team_id]),
  );
  const { data: bets, error: betsError } = await supabase
    .from("bets")
    .select("id, user_id, bet_option_id, amount")
    .in("bet_option_id", optionIds)
    .eq("payout_status", "pending");

  if (betsError) {
    throw new Error(`ベット一覧の取得に失敗しました: ${betsError.message}`);
  }
  if (bets.length === 0) {
    return { settledBetCount: 0, refunded: false };
  }

  let rateByOptionId = new Map<string, number>();
  let refunded = false;

  try {
    const rates = calculatePariMutuelRates(
      bets.map((bet) => ({
        optionId: bet.bet_option_id,
        amount: bet.amount,
      })),
      winningOptionIds,
    );
    rateByOptionId = new Map(rates.map((rate) => [rate.optionId, rate.rate]));
  } catch {
    // 的中者が一人もいない場合は全額返金（1倍払い戻し）として扱う
    refunded = true;
  }

  for (const bet of bets) {
    const isWinner = winningOptionIds.includes(bet.bet_option_id);
    const rate = refunded ? 1 : (rateByOptionId.get(bet.bet_option_id) ?? 0);
    const payoutAmount =
      isWinner || refunded ? Math.round(calculatePayout(bet.amount, rate)) : 0;
    const payoutStatus = isWinner || refunded ? "won" : "lost";

    const { error: updateBetError } = await supabase
      .from("bets")
      .update({ payout_status: payoutStatus, payout_amount: payoutAmount })
      .eq("id", bet.id);

    if (updateBetError) {
      throw new Error(`ベットの更新に失敗しました: ${updateBetError.message}`);
    }

    if (payoutAmount <= 0) {
      continue;
    }

    const { data: userRow, error: userFetchError } = await supabase
      .from("users")
      .select("coins")
      .eq("id", bet.user_id)
      .single();

    if (userFetchError || !userRow) {
      throw new Error("払戻し対象ユーザーの取得に失敗しました");
    }

    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ coins: userRow.coins + payoutAmount })
      .eq("id", bet.user_id);

    if (userUpdateError) {
      throw new Error(`コインの加算に失敗しました: ${userUpdateError.message}`);
    }

    const { error: coinLogError } = await supabase.from("coin_logs").insert({
      user_id: bet.user_id,
      type: "payout",
      amount: payoutAmount,
    });

    if (coinLogError) {
      throw new Error(
        `コイン履歴の記録に失敗しました: ${coinLogError.message}`,
      );
    }
  }

  // エールポイント加算（払戻計算とは独立、DESIGN_ADDENDUM.md参照）。
  // 勝敗に関わらず、player_idが設定されたoptionへの賭け金合計（stake）の
  // 一定割合をそのまま加算する（例: A選手に1000、B選手に2000賭けられ、
  // B選手が勝ってもA/B両選手にそれぞれの賭け金の10%が入る）。
  const stakeByOptionId = new Map<string, number>();
  for (const bet of bets) {
    stakeByOptionId.set(
      bet.bet_option_id,
      (stakeByOptionId.get(bet.bet_option_id) ?? 0) + bet.amount,
    );
  }

  const bonusRate = await getYellBonusRate(supabase);
  for (const [optionId, stake] of stakeByOptionId) {
    const bonus = Math.floor(stake * bonusRate);
    if (bonus <= 0) {
      continue;
    }

    const playerId = playerIdByOptionId.get(optionId);
    if (playerId) {
      await addYellPoints(supabase, playerId, bonus);
    }

    const teamId = teamIdByOptionId.get(optionId);
    if (teamId) {
      await addTeamYellPoints(supabase, teamId, bonus);
    }
  }

  return { settledBetCount: bets.length, refunded };
}
