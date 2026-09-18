import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { settleBetType } from "@/lib/betting/settle-bet-type";

interface SettleRequestBody {
  winningOptionIds?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as SettleRequestBody;
  const { winningOptionIds } = body;

  if (
    !Array.isArray(winningOptionIds) ||
    winningOptionIds.length === 0 ||
    !winningOptionIds.every((optionId) => typeof optionId === "string")
  ) {
    return NextResponse.json(
      { error: "winningOptionIdsは1件以上の文字列配列で指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  try {
    const result = await settleBetType(supabase, id, winningOptionIds);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: `精算処理に失敗しました: ${error instanceof Error ? error.message : "unknown error"}`,
      },
      { status: 500 },
    );
  }
}
