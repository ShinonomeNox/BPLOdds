import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { parseBulkRows, type BulkRowError } from "@/lib/admin/parse-bulk-text";
import type { LegacyStatCategoryType } from "@/types/database";

const CATEGORY_TYPES: LegacyStatCategoryType[] = ["theme", "level"];

interface BulkRequestBody {
  text?: unknown;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json()) as BulkRequestBody;
  const { text } = body;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "textを指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name");

  if (playersError) {
    return NextResponse.json(
      { error: `選手情報の取得に失敗しました: ${playersError.message}` },
      { status: 500 },
    );
  }

  const playerIdByName = new Map(players.map((p) => [p.name, p.id]));
  const rows = parseBulkRows(text);
  const validRows: {
    player_id: string;
    season: string;
    category_type: LegacyStatCategoryType;
    category_value: string;
    wins: number;
    plays: number;
  }[] = [];
  const errors: BulkRowError[] = [];

  rows.forEach((row, index) => {
    const [playerName, season, categoryType, categoryValue, winsStr, playsStr] =
      row;

    const playerId = playerIdByName.get(playerName);
    if (!playerId) {
      errors.push({
        line: index + 1,
        message: `選手「${playerName}」が見つかりません`,
      });
      return;
    }
    if (!season) {
      errors.push({ line: index + 1, message: "シーズンがありません" });
      return;
    }
    if (!CATEGORY_TYPES.includes(categoryType as LegacyStatCategoryType)) {
      errors.push({
        line: index + 1,
        message: "区分はtheme/levelのいずれかで指定してください",
      });
      return;
    }
    if (!categoryValue) {
      errors.push({ line: index + 1, message: "区分値がありません" });
      return;
    }
    const wins = Number(winsStr);
    const plays = Number(playsStr);
    if (!Number.isInteger(wins) || wins < 0) {
      errors.push({
        line: index + 1,
        message: "勝利数は0以上の整数で指定してください",
      });
      return;
    }
    if (!Number.isInteger(plays) || plays < 0) {
      errors.push({
        line: index + 1,
        message: "プレイ数は0以上の整数で指定してください",
      });
      return;
    }

    validRows.push({
      player_id: playerId,
      season,
      category_type: categoryType as LegacyStatCategoryType,
      category_value: categoryValue,
      wins,
      plays,
    });
  });

  if (validRows.length === 0) {
    return NextResponse.json({ successCount: 0, errors });
  }

  const { error } = await supabase
    .from("player_legacy_stats")
    .insert(validRows);

  if (error) {
    return NextResponse.json(
      { error: `一括登録に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ successCount: validRows.length, errors });
}
