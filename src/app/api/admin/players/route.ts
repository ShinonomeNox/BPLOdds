import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";

interface CreatePlayerRequestBody {
  name?: unknown;
  teamId?: unknown;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json()) as CreatePlayerRequestBody;
  const { name, teamId } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "nameを指定してください" },
      { status: 400 },
    );
  }
  if (typeof teamId !== "string") {
    return NextResponse.json(
      { error: "teamIdを指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

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

  const { data: player, error } = await supabase
    .from("players")
    .insert({
      name: name.trim(),
      team_id: teamId,
      game_title: team.game_title,
    })
    .select("*")
    .single();

  if (error || !player) {
    return NextResponse.json(
      {
        error: `選手の作成に失敗しました: ${error?.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ player });
}
