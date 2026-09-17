// パリミュチュエル方式の配当率計算（DESIGN.md参照）
// 控除率は運営が徴収しない前提（R=100%）。

export interface Bet {
  optionId: string;
  amount: number;
}

export interface PayoutRate {
  optionId: string;
  rate: number;
}

export function calculatePariMutuelRates(
  bets: readonly Bet[],
  winningOptionIds: readonly string[],
): PayoutRate[] {
  if (winningOptionIds.length === 0) {
    throw new Error("winningOptionIdsが空です。的中オプションを指定してください");
  }

  const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);

  const poolByWinningOption = new Map<string, number>(
    winningOptionIds.map((optionId) => [optionId, 0]),
  );
  for (const bet of bets) {
    if (poolByWinningOption.has(bet.optionId)) {
      poolByWinningOption.set(
        bet.optionId,
        (poolByWinningOption.get(bet.optionId) ?? 0) + bet.amount,
      );
    }
  }

  const winningPool = [...poolByWinningOption.values()].reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const losingPool = totalPool - winningPool;

  // 0票の組み合わせ（誰も賭けていないwinning option）は再分配対象から除外する
  const activeOptions = [...poolByWinningOption.entries()].filter(
    ([, amount]) => amount > 0,
  );

  if (activeOptions.length === 0) {
    throw new Error(
      "的中者が一人もいないため配当率を計算できません（返金など別ロジックで扱ってください）",
    );
  }

  const redistributionPerOption = losingPool / activeOptions.length;

  return activeOptions.map(([optionId, winAmount]) => ({
    optionId,
    rate: (winAmount + redistributionPerOption) / winAmount,
  }));
}

export function calculatePayout(amount: number, rate: number): number {
  return amount * rate;
}
