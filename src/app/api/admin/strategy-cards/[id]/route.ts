import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("strategy_card_usages")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: `使用記録の削除に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
