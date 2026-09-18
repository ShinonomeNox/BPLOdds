import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

interface CreateTeamRequestBody {
  name?: unknown;
  gameTitle?: unknown;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json()) as CreateTeamRequestBody;
  const { name, gameTitle } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "nameを指定してください" },
      { status: 400 },
    );
  }
  if (
    typeof gameTitle !== "string" ||
    !GAME_TITLES.includes(gameTitle as GameTitle)
  ) {
    return NextResponse.json(
      { error: "gameTitleはiidx/sdvx/ddrのいずれかで指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name: name.trim(), game_title: gameTitle as GameTitle })
    .select("*")
    .single();

  if (error || !team) {
    return NextResponse.json(
      {
        error: `チームの作成に失敗しました: ${error?.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ team });
}
