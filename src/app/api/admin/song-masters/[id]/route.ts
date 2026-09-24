import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";

interface UpdateSongRequestBody {
  name?: unknown;
  theme?: unknown;
  level?: unknown;
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
  const body = (await request.json()) as UpdateSongRequestBody;
  const { name, theme, level } = body;

  const update: { name?: string; theme?: string | null; level?: number | null } =
    {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "nameは空でない文字列で指定してください" },
        { status: 400 },
      );
    }
    update.name = name.trim();
  }
  if (theme !== undefined) {
    if (theme !== null && typeof theme !== "string") {
      return NextResponse.json(
        { error: "themeは文字列で指定してください" },
        { status: 400 },
      );
    }
    update.theme = theme;
  }
  if (level !== undefined) {
    if (level !== null && typeof level !== "number") {
      return NextResponse.json(
        { error: "levelは数値で指定してください" },
        { status: 400 },
      );
    }
    update.level = level;
  }

  const supabase = createServiceClient();
  const { data: song, error } = await supabase
    .from("songs")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `課題曲の更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!song) {
    return NextResponse.json({ error: "課題曲が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ song });
}

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
  const { error } = await supabase.from("songs").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: `課題曲の削除に失敗しました: ${error.message}` },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true });
}
