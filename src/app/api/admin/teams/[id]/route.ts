import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

interface UpdateTeamRequestBody {
  name?: unknown;
  gameTitle?: unknown;
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
  const body = (await request.json()) as UpdateTeamRequestBody;
  const { name, gameTitle } = body;

  const update: { name?: string; game_title?: GameTitle } = {};
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "nameは空でない文字列で指定してください" },
        { status: 400 },
      );
    }
    update.name = name.trim();
  }
  if (gameTitle !== undefined) {
    if (
      typeof gameTitle !== "string" ||
      !GAME_TITLES.includes(gameTitle as GameTitle)
    ) {
      return NextResponse.json(
        { error: "gameTitleはiidx/sdvx/ddrのいずれかで指定してください" },
        { status: 400 },
      );
    }
    update.game_title = gameTitle as GameTitle;
  }

  const supabase = createServiceClient();
  const { data: team, error } = await supabase
    .from("teams")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `チームの更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!team) {
    return NextResponse.json({ error: "チームが見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ team });
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
  const { error } = await supabase.from("teams").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        error: `チームの削除に失敗しました（試合や選手が紐づいている可能性があります）: ${error.message}`,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true });
}
