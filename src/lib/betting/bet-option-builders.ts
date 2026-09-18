import type { GameTitle, TeamSide } from "@/types/database";

// 各機種の点差ベット閾値（DESIGN.md参照）。
export const GAME_MARGIN_THRESHOLDS: Record<
  GameTitle,
  { closeMax: number; winMax: number }
> = {
  iidx: { closeMax: 5, winMax: 12 },
  sdvx: { closeMax: 3, winMax: 7 },
  ddr: { closeMax: 4, winMax: 9 },
};

export interface BuildableBetOption {
  optionKey: string;
  label: string;
  minDiff: number | null;
  maxDiff: number | null;
  side: TeamSide | null;
}

const SIDE_LABEL: Record<TeamSide, string> = { a: "Aチーム", b: "Bチーム" };

export interface TrifectaParticipant {
  id: string;
  name: string;
}

// 4人から3人を選ぶ3連単（4P3=24通り）を曲ごとに動的生成する。
// option_keyはdead-heat.tsのgetWinningTrifectasが返す形式（participant.idのカンマ区切り）と揃える。
export function buildTrifectaBetOptions(
  participants: readonly TrifectaParticipant[],
): BuildableBetOption[] {
  const options: BuildableBetOption[] = [];

  for (const first of participants) {
    for (const second of participants) {
      if (second.id === first.id) continue;
      for (const third of participants) {
        if (third.id === first.id || third.id === second.id) continue;
        options.push({
          optionKey: `${first.id},${second.id},${third.id}`,
          label: `${first.name} → ${second.name} → ${third.name}`,
          minDiff: null,
          maxDiff: null,
          side: null,
        });
      }
    }
  }

  return options;
}

export interface MarginThreshold {
  closeMax: number;
  winMax: number;
}

// 点差（スコア差）3段階 × 2チーム = 6択の共通ロジック
export function buildMarginBetOptionsFromThreshold(
  threshold: MarginThreshold,
  unitLabel = "点差",
): BuildableBetOption[] {
  const { closeMax, winMax } = threshold;
  const sides: TeamSide[] = ["a", "b"];

  return sides.flatMap((side) => [
    {
      optionKey: `${side}_close`,
      label: `${SIDE_LABEL[side]}僅差勝利（1〜${closeMax}${unitLabel}）`,
      minDiff: 1,
      maxDiff: closeMax,
      side,
    },
    {
      optionKey: `${side}_win`,
      label: `${SIDE_LABEL[side]}勝利（${closeMax + 1}〜${winMax}${unitLabel}）`,
      minDiff: closeMax + 1,
      maxDiff: winMax,
      side,
    },
    {
      optionKey: `${side}_big`,
      label: `${SIDE_LABEL[side]}大差勝利（${winMax + 1}${unitLabel}以上）`,
      minDiff: winMax + 1,
      maxDiff: null,
      side,
    },
  ]);
}

// チーム間の点差ベット（3段階 × 2チーム = 6択）
export function buildMarginBetOptions(
  gameTitle: GameTitle,
): BuildableBetOption[] {
  return buildMarginBetOptionsFromThreshold(GAME_MARGIN_THRESHOLDS[gameTitle]);
}

// メガミックスバトル（SDVX 1st match）の生スコア差ベット。
// DESIGN.md記載の仮閾値（僅差1〜3 / 勝利4〜7 / 大差8以上）。実運用で調整予定。
export const MEGAMIX_RAW_SCORE_DIFF_THRESHOLD: MarginThreshold = {
  closeMax: 3,
  winMax: 7,
};

export function buildMegamixRawScoreDiffBetOptions(): BuildableBetOption[] {
  return buildMarginBetOptionsFromThreshold(
    MEGAMIX_RAW_SCORE_DIFF_THRESHOLD,
    "スコア差",
  );
}

// DDRタッグバトルの順位配点パターン（5-1 / 4-2 / 3-3の3パターン、同点以外はside付きで5択）
export function buildDdrPairRankDiffBetOptions(): BuildableBetOption[] {
  return [
    {
      optionKey: "a_5_1",
      label: "Aチーム5-1",
      minDiff: null,
      maxDiff: null,
      side: "a",
    },
    {
      optionKey: "b_5_1",
      label: "Bチーム5-1",
      minDiff: null,
      maxDiff: null,
      side: "b",
    },
    {
      optionKey: "a_4_2",
      label: "Aチーム4-2",
      minDiff: null,
      maxDiff: null,
      side: "a",
    },
    {
      optionKey: "b_4_2",
      label: "Bチーム4-2",
      minDiff: null,
      maxDiff: null,
      side: "b",
    },
    {
      optionKey: "draw_3_3",
      label: "3-3（同点）",
      minDiff: null,
      maxDiff: null,
      side: null,
    },
  ];
}

// SDVXシングルバトル（3曲勝負）の結果パターン（仮実装、10択）。
// DESIGN.mdでは「未確定・実運用で調整予定」とされているため、他の結果パターンと
// 同じ考え方（勝ち-分け-負けの組み合わせをside付きで列挙）で暫定的に定義する。
export function buildSdvxSingleBattleResultBetOptions(): BuildableBetOption[] {
  const sides: TeamSide[] = ["a", "b"];

  const sidedPatterns: { suffix: string; label: string }[] = [
    { suffix: "sweep", label: "3タテ（3-0）" },
    { suffix: "win_one_draw", label: "2勝1分け（2-0-1分）" },
    { suffix: "win_one_loss", label: "2勝1敗（2-1）" },
    { suffix: "win_two_draw", label: "1勝2分け（1-0-2分）" },
  ];

  const sidedOptions = sides.flatMap((side) =>
    sidedPatterns.map(({ suffix, label }) => ({
      optionKey: `${side}_${suffix}`,
      label: `${SIDE_LABEL[side]}${label}`,
      minDiff: null,
      maxDiff: null,
      side,
    })),
  );

  return [
    ...sidedOptions,
    {
      optionKey: "one_win_one_loss_one_draw",
      label: "1勝1敗1分け",
      minDiff: null,
      maxDiff: null,
      side: null,
    },
    {
      optionKey: "triple_draw",
      label: "3分け",
      minDiff: null,
      maxDiff: null,
      side: null,
    },
  ];
}

// マッチ単位の結果パターン（IIDX2曲勝負／DDRシングル／SDVXタッグ共通の6択）
export function buildMatchResultBetOptions(): BuildableBetOption[] {
  return [
    {
      optionKey: "a_sweep",
      label: "Aチーム2タテ",
      minDiff: null,
      maxDiff: null,
      side: "a",
    },
    {
      optionKey: "b_sweep",
      label: "Bチーム2タテ",
      minDiff: null,
      maxDiff: null,
      side: "b",
    },
    {
      optionKey: "a_win_draw",
      label: "Aチーム1勝1分け",
      minDiff: null,
      maxDiff: null,
      side: "a",
    },
    {
      optionKey: "b_win_draw",
      label: "Bチーム1勝1分け",
      minDiff: null,
      maxDiff: null,
      side: "b",
    },
    {
      optionKey: "draw_draw",
      label: "2分け",
      minDiff: null,
      maxDiff: null,
      side: null,
    },
    {
      optionKey: "win_loss_split",
      label: "1勝1敗（引き分けなし）",
      minDiff: null,
      maxDiff: null,
      side: null,
    },
  ];
}
