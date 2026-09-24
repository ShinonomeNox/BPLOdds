import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

interface UpdatePlayerRequestBody {
  name?: unknown;
  teamId?: unknown;
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
  const body = (await request.json()) as UpdatePlayerRequestBody;
  const { name, teamId } = body;

  const supabase = createServiceClient();
  const update: {
    name?: string;
    team_id?: string;
    game_title?: GameTitle;
  } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "nameは空でない文字列で指定してください" },
        { status: 400 },
      );
    }
    update.name = name.trim();
  }

  if (teamId !== undefined) {
    if (typeof teamId !== "string") {
      return NextResponse.json(
        { error: "teamIdは文字列で指定してください" },
        { status: 400 },
      );
    }
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("game_title")
      .eq("id", teamId)
      .maybeSingle();

    if (teamError || !team) {
      return NextResponse.json(
        { error: "指定されたチームが見つかりません" },
        { status: 404 },
      );
    }
    update.team_id = teamId;
    update.game_title = team.game_title;
  }

  const { data: player, error } = await supabase
    .from("players")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `選手の更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!player) {
    return NextResponse.json({ error: "選手が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ player });
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
  const { error } = await supabase.from("players").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        error: `選手の削除に失敗しました（試合出場履歴が紐づいている可能性があります）: ${error.message}`,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true });
}
