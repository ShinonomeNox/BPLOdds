import type { GameTitle, TeamSide } from "@/types/database";

// 各機種の点差ベット閾値（4段階×2チーム＋引き分けの9択、均等4分割方式）。
// 例: IIDX なら 1-3 / 4-6 / 7-9 / 10+ の4段階。
export const GAME_MARGIN_TIERS: Record<GameTitle, [number, number, number]> = {
  iidx: [3, 6, 9],
  sdvx: [2, 4, 6],
  ddr: [3, 6, 9],
};

export interface BuildableBetOption {
  optionKey: string;
  label: string;
  subLabel?: string | null;
  minDiff: number | null;
  maxDiff: number | null;
  side: TeamSide | null;
}

const SIDE_LABEL: Record<TeamSide, string> = { a: "Aチーム", b: "Bチーム" };

export interface SideNames {
  a: string;
  b: string;
}

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

// 点差（スコア差）4段階 × 2チーム + 引き分け = 9択の共通ロジック。
// 各選択肢のlabelは「(チーム名) WIN」で統一し、点差レンジはsubLabelに分離する
// （同じチームのWIN選択肢が複数並ぶため、labelだけでは区別できない）。
export function buildMarginBetOptionsFromThreshold(
  tiers: readonly [number, number, number],
  teamNames: SideNames,
  unitLabel = "点差",
): BuildableBetOption[] {
  const [t1, t2, t3] = tiers;
  const sides: TeamSide[] = ["a", "b"];

  const bands: { suffix: string; subLabel: string; min: number; max: number | null }[] = [
    { suffix: "close", subLabel: `僅差勝利予想（1〜${t1}${unitLabel}）`, min: 1, max: t1 },
    { suffix: "mid", subLabel: `勝利予想（${t1 + 1}〜${t2}${unitLabel}）`, min: t1 + 1, max: t2 },
    { suffix: "high", subLabel: `勝利予想（${t2 + 1}〜${t3}${unitLabel}）`, min: t2 + 1, max: t3 },
    { suffix: "big", subLabel: `大差勝利予想（${t3 + 1}${unitLabel}以上）`, min: t3 + 1, max: null },
  ];

  const sidedOptions = sides.flatMap((side) =>
    bands.map((band) => ({
      optionKey: `${side}_${band.suffix}`,
      label: `${teamNames[side]} WIN`,
      subLabel: band.subLabel,
      minDiff: band.min,
      maxDiff: band.max,
      side,
    })),
  );

  return [
    ...sidedOptions,
    {
      optionKey: "draw",
      label: "引き分け",
      subLabel: null,
      minDiff: 0,
      maxDiff: 0,
      side: null,
    },
  ];
}

// チーム間の点差ベット（4段階 × 2チーム + 引き分け = 9択）
export function buildMarginBetOptions(
  gameTitle: GameTitle,
  teamNames: SideNames,
): BuildableBetOption[] {
  return buildMarginBetOptionsFromThreshold(GAME_MARGIN_TIERS[gameTitle], teamNames);
}

// シングルバトル初見のみ（IIDX、1曲のみ）の勝敗3択。
export function buildSingleFirstLookResultBetOptions(
  sideNames: SideNames,
): BuildableBetOption[] {
  return [
    {
      optionKey: "a_win",
      label: `${sideNames.a} WIN`,
      minDiff: null,
      maxDiff: null,
      side: "a",
    },
    {
      optionKey: "draw",
      label: "引き分け",
      minDiff: null,
      maxDiff: null,
      side: null,
    },
    {
      optionKey: "b_win",
      label: `${sideNames.b} WIN`,
      minDiff: null,
      maxDiff: null,
      side: "b",
    },
  ];
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
// 各sideの並びは勝ち数の多い順→引き分け数の多い順。
export function buildSdvxSingleBattleResultBetOptions(
  sideNames: SideNames,
): BuildableBetOption[] {
  const sides: TeamSide[] = ["a", "b"];

  const sidedPatterns: { suffix: string; label: string }[] = [
    { suffix: "sweep", label: "3タテ" },
    { suffix: "win_one_draw", label: "2勝1分け" },
    { suffix: "win_one_loss", label: "2勝1敗" },
    { suffix: "win_two_draw", label: "1勝2分け" },
  ];

  const sidedOptions = sides.flatMap((side) =>
    sidedPatterns.map(({ suffix, label }) => ({
      optionKey: `${side}_${suffix}`,
      label: `${sideNames[side]} ${label}`,
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

// メガミックスバトルの生スコア差ベット（MatchCategory.md準拠）。
// 4段階（3点差未満/4-6/7-9/10以上）×2チーム＋引き分けの9択。
// 点差が小さいものから順に並ぶよう配列順を保つ（sort_orderで永続化）。
export function buildMegamixRawScoreDiffBetOptions(): BuildableBetOption[] {
  const sides: TeamSide[] = ["a", "b"];
  const tiers: { suffix: string; label: string; min: number; max: number | null }[] = [
    { suffix: "close", label: "3点差未満勝利", min: 1, max: 3 },
    { suffix: "mid", label: "4-6点差勝利", min: 4, max: 6 },
    { suffix: "high", label: "7-9点差勝利", min: 7, max: 9 },
    { suffix: "big", label: "10点差以上勝利", min: 10, max: null },
  ];

  const sidedOptions = sides.flatMap((side) =>
    tiers.map((tier) => ({
      optionKey: `${side}_${tier.suffix}`,
      label: `${SIDE_LABEL[side]}${tier.label}`,
      minDiff: tier.min,
      maxDiff: tier.max,
      side,
    })),
  );

  return [
    ...sidedOptions,
    {
      optionKey: "draw",
      label: "引き分け",
      minDiff: 0,
      maxDiff: 0,
      side: null,
    },
  ];
}

// マッチ単位の結果パターン（IIDX2曲勝負／DDRシングル／SDVXタッグ共通の6択）。
// シングル形式は選手名1人分、タッグ形式（SDVX）は2人分（"選手A/選手A2"）を表示する。
export function buildMatchResultBetOptions(
  sideNames: SideNames,
): BuildableBetOption[] {
  return [
    {
      optionKey: "a_sweep",
      label: `${sideNames.a} 2タテ`,
      minDiff: null,
      maxDiff: null,
      side: "a",
    },
    {
      optionKey: "b_sweep",
      label: `${sideNames.b} 2タテ`,
      minDiff: null,
      maxDiff: null,
      side: "b",
    },
    {
      optionKey: "a_win_draw",
      label: `${sideNames.a} 1勝1分け`,
      minDiff: null,
      maxDiff: null,
      side: "a",
    },
    {
      optionKey: "b_win_draw",
      label: `${sideNames.b} 1勝1分け`,
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
