import type { GameTitle, RoundFormat } from "@/types/database";
import {
  buildMarginBetOptions,
  buildMatchResultBetOptions,
  buildMegamixRawScoreDiffBetOptions,
  type BuildableBetOption,
} from "@/lib/betting/bet-option-builders";

export const ROUND_FORMAT_LABEL_JA: Record<RoundFormat, string> = {
  single: "シングルバトル",
  tag: "タッグバトル",
  megamix: "メガミックスバトル",
};

export interface MatchBetTypeDef {
  typeKey: string;
  label: string;
  options: BuildableBetOption[];
}

// 試合全体（対戦カード）単位のベットは点差予想のみ。
// 「試合の勝敗（2択）」は行わず、点差レンジでの勝敗予想に一本化する。
export function buildMatchLevelBetTypeDefs(
  gameTitle: GameTitle,
): MatchBetTypeDef[] {
  return [
    {
      typeKey: "team_margin",
      label: "点差予想",
      options: buildMarginBetOptions(gameTitle),
    },
  ];
}

// マッチ（ラウンド、1st/2nd/3rd/4th）単位のベット。
// シングル/タッグは共通の結果パターン（2タテ・勝ち引き分け・1勝1敗）、
// メガミックスは生スコア差予想を使う。
export function buildRoundLevelBetTypeDef(
  format: RoundFormat,
  roundLabel: string,
): MatchBetTypeDef {
  if (format === "megamix") {
    return {
      typeKey: "megamix_raw_score_diff",
      label: `${roundLabel}予想（スコア差）`,
      options: buildMegamixRawScoreDiffBetOptions(),
    };
  }
  return {
    typeKey: "match_result",
    label: `${roundLabel}予想`,
    options: buildMatchResultBetOptions(),
  };
}
