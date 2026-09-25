import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";

interface UpdateScheduleRequestBody {
  startTime?: unknown;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ gameKey: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { gameKey } = await params;
  const body = (await request.json()) as UpdateScheduleRequestBody;
  const { startTime } = body;

  if (typeof startTime !== "string" || Number.isNaN(Date.parse(startTime))) {
    return NextResponse.json(
      { error: "startTimeはISO日時文字列で指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: schedule, error } = await supabase
    .from("game_schedules")
    .update({ start_time: startTime, updated_at: new Date().toISOString() })
    .eq("game_key", decodeURIComponent(gameKey))
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!schedule) {
    return NextResponse.json({ error: "日程が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ schedule });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ gameKey: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { gameKey } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("game_schedules")
    .delete()
    .eq("game_key", decodeURIComponent(gameKey));

  if (error) {
    return NextResponse.json(
      { error: `削除に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
