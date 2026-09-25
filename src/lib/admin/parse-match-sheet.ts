import type { GameTitle, RoundFormat } from "@/types/database";

export interface ParsedSongRow {
  order: string;
  roundNumber: number;
  roundFormat: RoundFormat;
  theme: string;
  levelRange: string;
  playerA: string;
  playerB: string;
  playerA2: string | null;
  playerB2: string | null;
}

export interface ParsedGameBlock {
  gameTitle: GameTitle;
  songs: ParsedSongRow[];
}

export interface ParsedMatchSheet {
  gameKey: string;
  teamAName: string;
  teamBName: string;
  blocks: ParsedGameBlock[];
}

const GAME_TITLE_MAP: Record<string, GameTitle> = {
  IIDX: "iidx",
  SDVX: "sdvx",
  DDR: "ddr",
};

// "Final"は決勝の特別ラウンド。round_numberは999として扱いソート順を末尾にする。
export const FINAL_ROUND_NUMBER = 999;

export const ROUND_LABEL_TO_NUMBER: Record<string, number> = {
  "1st": 1,
  "2nd": 2,
  "3rd": 3,
  "4th": 4,
  "5th": 5,
  "6th": 6,
  "7th": 7,
  "8th": 8,
  Final: FINAL_ROUND_NUMBER,
};

export const ROUND_NUMBER_TO_LABEL: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
  6: "6th",
  7: "7th",
  8: "8th",
  [FINAL_ROUND_NUMBER]: "Final",
};

// MatchCategory.md準拠の6試合形式
export const TSV_FORMAT_LABEL_TO_ROUND_FORMAT: Record<string, RoundFormat> = {
  シングルバトル: "single",
  シングルバトル初見のみ: "single_first_look",
  "シングルバトル+初見": "single_with_first_look",
  "タッグバトル(SDVX)": "tag_score",
  "タッグバトル(DDR)": "tag_trifecta",
  メガミックスバトル: "megamix",
};

// 対戦カード表（試合番号・Aチーム/Bチーム・機種ごとのマッチ一覧）を
// スプレッドシートからタブ区切りでコピーした形式のテキストをパースする。
// 1行＝1マッチ（1st/2nd/3rd/4th）。試合形式がタッグバトルの場合のみ選手A2/B2が入る。
export function parseMatchSheet(text: string): ParsedMatchSheet {
  const rows = text
    .split("\n")
    .map((line) => line.replace(/\r$/, "").split("\t"));

  let gameKey = "";
  let teamAName = "";
  let teamBName = "";
  const blocks: ParsedGameBlock[] = [];
  let currentBlock: ParsedGameBlock | null = null;

  for (const row of rows) {
    const first = (row[0] ?? "").trim();

    if (row.every((cell) => !cell.trim())) {
      continue;
    }
    if (first === "Game") {
      gameKey = (row[1] ?? "").trim().toLowerCase();
      continue;
    }
    if (first === "Team A") {
      teamAName = (row[1] ?? "").trim();
      continue;
    }
    if (first === "Team B") {
      teamBName = (row[1] ?? "").trim();
      continue;
    }

    const gameTitle = GAME_TITLE_MAP[first.toUpperCase()];
    if (gameTitle) {
      currentBlock = { gameTitle, songs: [] };
      blocks.push(currentBlock);
      continue;
    }

    if (!currentBlock) {
      continue;
    }

    const [order, format, theme, levelRange, playerA, playerB, playerA2, playerB2] =
      row;
    if (!(theme ?? "").trim() && !(playerA ?? "").trim()) {
      continue;
    }

    const trimmedOrder = (order ?? "").trim();
    const roundNumber = ROUND_LABEL_TO_NUMBER[trimmedOrder];
    if (roundNumber === undefined) {
      throw new Error(
        `${currentBlock.gameTitle.toUpperCase()}: 「${trimmedOrder}」はラウンド表記（1st〜8th/Final）として認識できません`,
      );
    }

    const trimmedFormat = (format ?? "").trim();
    const roundFormat = TSV_FORMAT_LABEL_TO_ROUND_FORMAT[trimmedFormat];
    if (!roundFormat) {
      throw new Error(
        `${currentBlock.gameTitle.toUpperCase()} ${trimmedOrder}: 試合形式「${trimmedFormat}」を認識できません（${Object.keys(TSV_FORMAT_LABEL_TO_ROUND_FORMAT).join("/")}のいずれかで指定してください）`,
      );
    }

    currentBlock.songs.push({
      order: trimmedOrder,
      roundNumber,
      roundFormat,
      theme: (theme ?? "").trim(),
      levelRange: (levelRange ?? "").trim(),
      playerA: (playerA ?? "").trim(),
      playerB: (playerB ?? "").trim(),
      playerA2: (playerA2 ?? "").trim() || null,
      playerB2: (playerB2 ?? "").trim() || null,
    });
  }

  return { gameKey, teamAName, teamBName, blocks };
}
