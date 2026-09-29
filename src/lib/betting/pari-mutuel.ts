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

// 精算確定後の表示用：正解選択肢の確定倍率を算出する。
// 的中者が一人もいない（全額返金）場合はsettleBetTypeと同じくx1.0として扱う。
export function calculateConfirmedRates(
  bets: readonly Bet[],
  winningOptionIds: readonly string[],
): Map<string, number> {
  if (winningOptionIds.length === 0) {
    return new Map();
  }
  try {
    const rates = calculatePariMutuelRates(bets, winningOptionIds);
    return new Map(rates.map((rate) => [rate.optionId, rate.rate]));
  } catch {
    return new Map(winningOptionIds.map((optionId) => [optionId, 1]));
  }
}

export interface ApproximateOddsRate {
  optionId: string;
  rate: number | null; // 表示用の概算オッズ（シード込み、常に計算可能）
  poolAmount: number; // 実際の賭け金合計（シード抜き、「あなたの賭け」等の表示に使う）
}

// 表示用の初期流動性シード。実際の精算・エールポイント計算には一切使わない
// 純粋な表示計算専用の仮想値（DBには保存しない）。全optionが「未賭け」のまま
// だと寂しいため、各optionに同額を賭けたと仮定してオッズを算出する。
const DISPLAY_SEED_AMOUNT = 100;

// 現在の賭け状況から、各optionが単独で的中したと仮定した場合の概算オッズを算出する。
// rate = totalPool / poolOnOption（calculatePariMutuelRatesにwinningOptionIds=[optionId]
// だけを渡した場合と数学的に同値だが、全option分を1パスで計算できる）。
export function calculateApproximateOdds(
  bets: readonly Bet[],
  optionIds: readonly string[],
  seedAmount: number = DISPLAY_SEED_AMOUNT,
): ApproximateOddsRate[] {
  const realPoolByOptionId = new Map<string, number>();
  for (const bet of bets) {
    realPoolByOptionId.set(
      bet.optionId,
      (realPoolByOptionId.get(bet.optionId) ?? 0) + bet.amount,
    );
  }

  const totalPool = optionIds.reduce(
    (sum, id) => sum + (realPoolByOptionId.get(id) ?? 0) + seedAmount,
    0,
  );

  return optionIds.map((optionId) => {
    const realPoolAmount = realPoolByOptionId.get(optionId) ?? 0;
    const seededPoolAmount = realPoolAmount + seedAmount;
    return {
      optionId,
      poolAmount: realPoolAmount,
      rate: seededPoolAmount > 0 ? totalPool / seededPoolAmount : null,
    };
  });
}
