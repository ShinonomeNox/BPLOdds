import type { GameTitle } from "@/types/database";
import {
  buildMarginBetOptions,
  buildMatchResultBetOptions,
  buildMegamixRawScoreDiffBetOptions,
  buildSdvxSingleBattleResultBetOptions,
  type BuildableBetOption,
} from "@/lib/betting/bet-option-builders";

export const MATCH_FORMATS = [
  "iidx_standard",
  "ddr_single",
  "ddr_tag",
  "sdvx_tag",
  "sdvx_single",
  "sdvx_megamix",
] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export const MATCH_FORMAT_GAME_TITLE: Record<MatchFormat, GameTitle> = {
  iidx_standard: "iidx",
  ddr_single: "ddr",
  ddr_tag: "ddr",
  sdvx_tag: "sdvx",
  sdvx_single: "sdvx",
  sdvx_megamix: "sdvx",
};

export interface MatchBetTypeDef {
  typeKey: string;
  label: string;
  options: BuildableBetOption[];
}

// 試合作成時点でmatch単位のベットを生成する対戦形式のみここで定義する。
// DDRタッグのように曲単位でしかベットが発生しない形式は空配列を返し、
// 3連単・順位配点ベットは曲登録API（/api/admin/matches/[id]/songs）で生成する。
export function buildMatchLevelBetTypeDefs(
  format: MatchFormat,
): MatchBetTypeDef[] {
  switch (format) {
    case "iidx_standard":
    case "ddr_single":
    case "sdvx_tag":
      return [
        {
          typeKey: "team_margin",
          label: "点差予想",
          options: buildMarginBetOptions(MATCH_FORMAT_GAME_TITLE[format]),
        },
        {
          typeKey: "match_result",
          label: "試合結果",
          options: buildMatchResultBetOptions(),
        },
      ];
    case "sdvx_single":
      return [
        {
          typeKey: "sdvx_single_result",
          label: "試合結果（3曲）",
          options: buildSdvxSingleBattleResultBetOptions(),
        },
      ];
    case "sdvx_megamix":
      return [
        {
          typeKey: "megamix_raw_score_diff",
          label: "生スコア差予想",
          options: buildMegamixRawScoreDiffBetOptions(),
        },
      ];
    case "ddr_tag":
      return [];
  }
}
