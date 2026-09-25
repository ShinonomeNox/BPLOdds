import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { scheduleSortKey } from "@/lib/admin/game-schedule-sort";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data: schedules, error } = await supabase
    .from("game_schedules")
    .select("*");

  if (error) {
    return NextResponse.json(
      { error: `試合日程の取得に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  const sorted = [...schedules].sort(
    (a, b) => scheduleSortKey(a.game_key) - scheduleSortKey(b.game_key),
  );

  return NextResponse.json({ schedules: sorted });
}
