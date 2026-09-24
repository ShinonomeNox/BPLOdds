import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";

interface UpdateUserRequestBody {
  isAdmin?: unknown;
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
  const body = (await request.json()) as UpdateUserRequestBody;
  const { isAdmin } = body;

  if (typeof isAdmin !== "boolean") {
    return NextResponse.json(
      { error: "isAdminはtrue/falseで指定してください" },
      { status: 400 },
    );
  }
  if (id === admin.userId && !isAdmin) {
    return NextResponse.json(
      { error: "自分自身の管理者権限は剥奪できません" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: user, error } = await supabase
    .from("users")
    .update({ is_admin: isAdmin })
    .eq("id", id)
    .select("id, login_id, is_admin")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!user) {
    return NextResponse.json(
      { error: "ユーザーが見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ user });
}
