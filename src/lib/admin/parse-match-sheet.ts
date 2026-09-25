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
  teamAName: string;
  teamBName: string;
  blocks: ParsedGameBlock[];
}

const GAME_TITLE_MAP: Record<string, GameTitle> = {
  IIDX: "iidx",
  SDVX: "sdvx",
  DDR: "ddr",
};

export const ROUND_LABEL_TO_NUMBER: Record<string, number> = {
  "1st": 1,
  "2nd": 2,
  "3rd": 3,
  "4th": 4,
};

export const ROUND_NUMBER_TO_LABEL: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
};

export const TSV_FORMAT_LABEL_TO_ROUND_FORMAT: Record<string, RoundFormat> = {
  シングルバトル: "single",
  タッグバトル: "tag",
  メガミックスバトル: "megamix",
};

// 対戦カード表（試合番号・Aチーム/Bチーム・機種ごとのマッチ一覧）を
// スプレッドシートからタブ区切りでコピーした形式のテキストをパースする。
// 1行＝1マッチ（1st/2nd/3rd/4th）。試合形式がタッグバトルの場合のみ選手A2/B2が入る。
export function parseMatchSheet(text: string): ParsedMatchSheet {
  const rows = text
    .split("\n")
    .map((line) => line.replace(/\r$/, "").split("\t"));

  let teamAName = "";
  let teamBName = "";
  const blocks: ParsedGameBlock[] = [];
  let currentBlock: ParsedGameBlock | null = null;

  for (const row of rows) {
    const first = (row[0] ?? "").trim();

    if (row.every((cell) => !cell.trim())) {
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
    if (first === "Game") {
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
        `${currentBlock.gameTitle.toUpperCase()}: 「${trimmedOrder}」はラウンド表記（1st/2nd/3rd/4th）として認識できません`,
      );
    }

    const trimmedFormat = (format ?? "").trim();
    const roundFormat = TSV_FORMAT_LABEL_TO_ROUND_FORMAT[trimmedFormat];
    if (!roundFormat) {
      throw new Error(
        `${currentBlock.gameTitle.toUpperCase()} ${trimmedOrder}: 試合形式「${trimmedFormat}」を認識できません（シングルバトル/タッグバトル/メガミックスバトルのいずれかで指定してください）`,
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

  return { teamAName, teamBName, blocks };
}
