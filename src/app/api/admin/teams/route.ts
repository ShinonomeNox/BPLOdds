import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

interface CreateTeamRequestBody {
  name?: unknown;
  gameTitle?: unknown;
  color?: unknown;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json()) as CreateTeamRequestBody;
  const { name, gameTitle, color } = body;

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
  if (
    color !== undefined &&
    color !== null &&
    (typeof color !== "string" || !HEX_COLOR_PATTERN.test(color))
  ) {
    return NextResponse.json(
      { error: "colorは#RRGGBB形式で指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      name: name.trim(),
      game_title: gameTitle as GameTitle,
      color: (color as string | undefined) || null,
    })
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
