import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { MatchStatus } from "@/types/database";

const MATCH_STATUSES: MatchStatus[] = ["scheduled", "live", "settled"];

interface UpdateMatchRequestBody {
  status?: unknown;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateMatchRequestBody;
  const { status } = body;

  if (typeof status !== "string" || !MATCH_STATUSES.includes(status as MatchStatus)) {
    return NextResponse.json(
      { error: "statusはscheduled/live/settledのいずれかで指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: match, error } = await supabase
    .from("matches")
    .update({ status: status as MatchStatus })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `試合ステータスの更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!match) {
    return NextResponse.json({ error: "試合が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ match });
}
