import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { parseBulkRows, type BulkRowError } from "@/lib/admin/parse-bulk-text";

interface BulkRequestBody {
  text?: unknown;
}

const JST_OFFSET = "+09:00";

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
  const validRows: { game_key: string; start_time: string }[] = [];
  const errors: BulkRowError[] = [];

  rows.forEach((row, index) => {
    const [gameKeyRaw, date, time] = row;
    const gameKey = (gameKeyRaw ?? "").trim().toLowerCase();
    if (!gameKey || gameKey.startsWith("game")) {
      // ヘッダー行（"Game  Date  Time"やタブ区切りの"Game"列）はスキップ
      return;
    }
    if (!date || !time) {
      errors.push({ line: index + 1, message: "日付・時刻がありません" });
      return;
    }
    const isoString = `${date}T${time}:00${JST_OFFSET}`;
    const parsedDate = new Date(isoString);
    if (Number.isNaN(parsedDate.getTime())) {
      errors.push({
        line: index + 1,
        message: `日付・時刻の形式が不正です（${date} ${time}）`,
      });
      return;
    }
    validRows.push({ game_key: gameKey, start_time: parsedDate.toISOString() });
  });

  if (validRows.length === 0) {
    return NextResponse.json({ successCount: 0, errors });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("game_schedules")
    .upsert(validRows, { onConflict: "game_key" });

  if (error) {
    return NextResponse.json(
      { error: `一括登録に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ successCount: validRows.length, errors });
}
