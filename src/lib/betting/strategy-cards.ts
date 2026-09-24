import type { GameTitle } from "@/types/database";

// 各機種で選択可能な「使用ラウンド」ラベル。
// DDR: シングルバトル / タッグバトルで1枚ずつ
// SDVX: 2nd / 3rdで1枚ずつ
// IIDX: 4対戦（1st〜4th）のうち2種類まで
// 組み合わせの妥当性（例: IIDXの4th+4thは不可）は自動チェックせず、
// 記録・表示のみ行い運営の目視判断に委ねる。
export const STRATEGY_CARD_ROUND_LABELS: Record<GameTitle, string[]> = {
  ddr: ["シングルバトル", "タッグバトル"],
  sdvx: ["2nd", "3rd"],
  iidx: ["1st", "2nd", "3rd", "4th"],
};

// チーム（機種ごとに別レコード）あたりの保有枚数
export const STRATEGY_CARD_LIMIT_PER_TEAM = 2;
