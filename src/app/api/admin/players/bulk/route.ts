import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { parseBulkRows, type BulkRowError } from "@/lib/admin/parse-bulk-text";
import type { GameTitle } from "@/types/database";

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
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, game_title");

  if (teamsError) {
    return NextResponse.json(
      { error: `チーム情報の取得に失敗しました: ${teamsError.message}` },
      { status: 500 },
    );
  }

  const teamByName = new Map(teams.map((t) => [t.name, t]));
  const rows = parseBulkRows(text);
  const validRows: { name: string; team_id: string; game_title: GameTitle }[] =
    [];
  const errors: BulkRowError[] = [];

  rows.forEach((row, index) => {
    const [name, teamName] = row;
    if (!name) {
      errors.push({ line: index + 1, message: "選手名がありません" });
      return;
    }
    if (!teamName) {
      errors.push({ line: index + 1, message: "チーム名がありません" });
      return;
    }
    const team = teamByName.get(teamName);
    if (!team) {
      errors.push({
        line: index + 1,
        message: `チーム「${teamName}」が見つかりません`,
      });
      return;
    }
    validRows.push({ name, team_id: team.id, game_title: team.game_title });
  });

  if (validRows.length === 0) {
    return NextResponse.json({ successCount: 0, errors });
  }

  const { error } = await supabase.from("players").insert(validRows);

  if (error) {
    return NextResponse.json(
      { error: `一括登録に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ successCount: validRows.length, errors });
}
