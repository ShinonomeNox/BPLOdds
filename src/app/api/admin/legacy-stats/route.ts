import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { LegacyStatCategoryType } from "@/types/database";

const CATEGORY_TYPES: LegacyStatCategoryType[] = ["theme", "level"];

interface CreateLegacyStatRequestBody {
  playerId?: unknown;
  season?: unknown;
  categoryType?: unknown;
  categoryValue?: unknown;
  wins?: unknown;
  plays?: unknown;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json()) as CreateLegacyStatRequestBody;
  const { playerId, season, categoryType, categoryValue, wins, plays } = body;

  if (typeof playerId !== "string") {
    return NextResponse.json(
      { error: "playerIdを指定してください" },
      { status: 400 },
    );
  }
  if (typeof season !== "string" || season.trim().length === 0) {
    return NextResponse.json(
      { error: "seasonを指定してください（例: season5）" },
      { status: 400 },
    );
  }
  if (
    typeof categoryType !== "string" ||
    !CATEGORY_TYPES.includes(categoryType as LegacyStatCategoryType)
  ) {
    return NextResponse.json(
      { error: "categoryTypeはtheme/levelのいずれかで指定してください" },
      { status: 400 },
    );
  }
  if (typeof categoryValue !== "string" || categoryValue.trim().length === 0) {
    return NextResponse.json(
      { error: "categoryValueを指定してください" },
      { status: 400 },
    );
  }
  if (typeof wins !== "number" || !Number.isInteger(wins) || wins < 0) {
    return NextResponse.json(
      { error: "winsは0以上の整数で指定してください" },
      { status: 400 },
    );
  }
  if (typeof plays !== "number" || !Number.isInteger(plays) || plays < 0) {
    return NextResponse.json(
      { error: "playsは0以上の整数で指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError || !player) {
    return NextResponse.json(
      { error: "指定された選手が見つかりません" },
      { status: 404 },
    );
  }

  const { data: stat, error } = await supabase
    .from("player_legacy_stats")
    .insert({
      player_id: playerId,
      season: season.trim(),
      category_type: categoryType as LegacyStatCategoryType,
      category_value: categoryValue.trim(),
      wins,
      plays,
    })
    .select("*")
    .single();

  if (error || !stat) {
    return NextResponse.json(
      {
        error: `前シーズン統計の作成に失敗しました: ${error?.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ stat });
}
