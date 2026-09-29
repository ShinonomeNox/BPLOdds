import type { GameTitle, RoundFormat } from "@/types/database";
import {
  buildMarginBetOptions,
  buildMatchResultBetOptions,
  buildMegamixRawScoreDiffBetOptions,
  buildSdvxSingleBattleResultBetOptions,
  buildSingleFirstLookResultBetOptions,
  type BuildableBetOption,
  type SideNames,
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
  teamNames: SideNames,
): MatchBetTypeDef[] {
  return [
    {
      typeKey: "team_margin",
      label: "点差予想",
      options: buildMarginBetOptions(gameTitle, teamNames),
    },
  ];
}

export interface RoundPlayerNames {
  aName: string;
  bName: string;
  a2Name?: string | null;
  b2Name?: string | null;
}

// タッグ形式（SDVXタッグ）は "選手A/選手A2" のように2人分を1つの表示名にまとめる。
function toSideNames(players: RoundPlayerNames): SideNames {
  return {
    a: players.a2Name ? `${players.aName}/${players.a2Name}` : players.aName,
    b: players.b2Name ? `${players.bName}/${players.b2Name}` : players.bName,
  };
}

// マッチ（ラウンド、1st/2nd/3rd...）単位のベット（MatchCategory.md準拠）。
// tag_trifecta（DDRタッグ）はラウンド単位のベットを持たず、
// 曲単位の3連単のみで構成されるためnullを返す。
export function buildRoundLevelBetTypeDef(
  format: RoundFormat,
  roundLabel: string,
  players: RoundPlayerNames,
): MatchBetTypeDef | null {
  const sideNames = toSideNames(players);
  switch (format) {
    case "single":
    case "tag_score":
      return {
        typeKey: "match_result",
        label: `${roundLabel}予想`,
        options: buildMatchResultBetOptions(sideNames),
      };
    case "single_first_look":
      return {
        typeKey: "single_first_look_result",
        label: `${roundLabel}予想`,
        options: buildSingleFirstLookResultBetOptions(sideNames),
      };
    case "single_with_first_look":
      return {
        typeKey: "sdvx_single_result",
        label: `${roundLabel}予想`,
        options: buildSdvxSingleBattleResultBetOptions(sideNames),
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
