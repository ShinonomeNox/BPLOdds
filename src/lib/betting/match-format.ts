import type { GameTitle, RoundFormat } from "@/types/database";
import {
  buildMarginBetOptions,
  buildMatchResultBetOptions,
  buildMegamixRawScoreDiffBetOptions,
  buildSdvxSingleBattleResultBetOptions,
  buildSingleFirstLookResultBetOptions,
  type BuildableBetOption,
} from "@/lib/betting/bet-option-builders";

export const ROUND_FORMAT_LABEL_JA: Record<RoundFormat, string> = {
  single: "シングルバトル",
  single_first_look: "シングルバトル初見のみ",
  single_with_first_look: "シングルバトル+初見",
  tag_score: "タッグバトル(SDVX)",
  tag_trifecta: "タッグバトル(DDR)",
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

// マッチ（ラウンド、1st/2nd/3rd...）単位のベット（MatchCategory.md準拠）。
// tag_trifecta（DDRタッグ）はラウンド単位のベットを持たず、
// 曲単位の3連単のみで構成されるためnullを返す。
export function buildRoundLevelBetTypeDef(
  format: RoundFormat,
  roundLabel: string,
): MatchBetTypeDef | null {
  switch (format) {
    case "single":
    case "tag_score":
      return {
        typeKey: "match_result",
        label: `${roundLabel}予想`,
        options: buildMatchResultBetOptions(),
      };
    case "single_first_look":
      return {
        typeKey: "single_first_look_result",
        label: `${roundLabel}予想`,
        options: buildSingleFirstLookResultBetOptions(),
      };
    case "single_with_first_look":
      return {
        typeKey: "sdvx_single_result",
        label: `${roundLabel}予想`,
        options: buildSdvxSingleBattleResultBetOptions(),
      };
    case "megamix":
      return {
        typeKey: "megamix_raw_score_diff",
        label: `${roundLabel}予想（スコア差）`,
        options: buildMegamixRawScoreDiffBetOptions(),
      };
    case "tag_trifecta":
      return null;
  }
}
