import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];

interface CreateSongRequestBody {
  gameTitle?: unknown;
  name?: unknown;
  theme?: unknown;
  level?: unknown;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json()) as CreateSongRequestBody;
  const { gameTitle, name, theme, level } = body;

  if (
    typeof gameTitle !== "string" ||
    !GAME_TITLES.includes(gameTitle as GameTitle)
  ) {
    return NextResponse.json(
      { error: "gameTitleはiidx/sdvx/ddrのいずれかで指定してください" },
      { status: 400 },
    );
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "nameを指定してください" },
      { status: 400 },
    );
  }
  if (theme !== undefined && theme !== null && typeof theme !== "string") {
    return NextResponse.json(
      { error: "themeは文字列で指定してください" },
      { status: 400 },
    );
  }
  if (level !== undefined && level !== null && typeof level !== "number") {
    return NextResponse.json(
      { error: "levelは数値で指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: song, error } = await supabase
    .from("songs")
    .insert({
      game_title: gameTitle as GameTitle,
      name: name.trim(),
      theme: theme ?? null,
      level: level ?? null,
    })
    .select("*")
    .single();

  if (error || !song) {
    return NextResponse.json(
      {
        error: `課題曲の作成に失敗しました: ${error?.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ song });
}
