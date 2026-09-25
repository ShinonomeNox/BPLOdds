import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { deleteMatchRound } from "@/lib/admin/delete-match-round";
import type { MatchStatus } from "@/types/database";

const ROUND_STATUSES: MatchStatus[] = ["scheduled", "live", "settled"];

interface UpdateRoundRequestBody {
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
  const body = (await request.json()) as UpdateRoundRequestBody;
  const { status } = body;

  if (
    typeof status !== "string" ||
    !ROUND_STATUSES.includes(status as MatchStatus)
  ) {
    return NextResponse.json(
      { error: "statusはscheduled/live/settledのいずれかで指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: round, error } = await supabase
    .from("match_rounds")
    .update({ status: status as MatchStatus })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `ラウンドステータスの更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!round) {
    return NextResponse.json({ error: "ラウンドが見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ round });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  const supabase = createServiceClient();
  try {
    const result = await deleteMatchRound(supabase, id, force);
    if (result.blocked) {
      return NextResponse.json(
        {
          error: `精算済みの賭け履歴が${result.settledCount}件あります。本当に削除する場合はforce=trueを付けてください`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
