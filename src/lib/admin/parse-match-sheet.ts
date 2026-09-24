import type { GameTitle } from "@/types/database";

export interface ParsedSongRow {
  order: string;
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

// 対戦カード表（試合番号・Aチーム/Bチーム・機種ごとの曲一覧）を
// スプレッドシートからタブ区切りでコピーした形式のテキストをパースする。
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

    const [order, theme, levelRange, playerA, playerB, playerA2, playerB2] =
      row;
    if (!(theme ?? "").trim() && !(playerA ?? "").trim()) {
      continue;
    }

    currentBlock.songs.push({
      order: (order ?? "").trim(),
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
