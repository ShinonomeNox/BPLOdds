import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { parseBulkRows, type BulkRowError } from "@/lib/admin/parse-bulk-text";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

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

  const rows = parseBulkRows(text);
  const validRows: { name: string; game_title: GameTitle }[] = [];
  const errors: BulkRowError[] = [];

  rows.forEach((row, index) => {
    const [name, gameTitle] = row;
    if (!name) {
      errors.push({ line: index + 1, message: "チーム名がありません" });
      return;
    }
    if (!gameTitle || !GAME_TITLES.includes(gameTitle as GameTitle)) {
      errors.push({
        line: index + 1,
        message: "機種はiidx/sdvx/ddrのいずれかで指定してください",
      });
      return;
    }
    validRows.push({ name, game_title: gameTitle as GameTitle });
  });

  if (validRows.length === 0) {
    return NextResponse.json({ successCount: 0, errors });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("teams").insert(validRows);

  if (error) {
    return NextResponse.json(
      { error: `一括登録に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ successCount: validRows.length, errors });
}
