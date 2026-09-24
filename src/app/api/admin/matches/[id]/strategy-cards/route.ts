import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { STRATEGY_CARD_ROUND_LABELS } from "@/lib/betting/strategy-cards";

interface CreateStrategyCardUsageRequestBody {
  teamId?: unknown;
  roundLabel?: unknown;
  targetSongId?: unknown;
  note?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id: matchId } = await params;
  const body = (await request.json()) as CreateStrategyCardUsageRequestBody;
  const { teamId, roundLabel, targetSongId, note } = body;

  if (typeof teamId !== "string" || teamId.length === 0) {
    return NextResponse.json(
      { error: "teamIdを指定してください" },
      { status: 400 },
    );
  }
  if (typeof roundLabel !== "string" || roundLabel.length === 0) {
    return NextResponse.json(
      { error: "roundLabelを指定してください" },
      { status: 400 },
    );
  }
  if (targetSongId !== undefined && targetSongId !== null && typeof targetSongId !== "string") {
    return NextResponse.json(
      { error: "targetSongIdは文字列で指定してください" },
      { status: 400 },
    );
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json(
      { error: "noteは文字列で指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, game_title")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError || !team) {
    return NextResponse.json(
      { error: "チームが見つかりません" },
      { status: 400 },
    );
  }

  if (!STRATEGY_CARD_ROUND_LABELS[team.game_title].includes(roundLabel)) {
    return NextResponse.json(
      {
        error: `roundLabelは${STRATEGY_CARD_ROUND_LABELS[team.game_title].join("/")}のいずれかで指定してください`,
      },
      { status: 400 },
    );
  }

  const { data: usage, error } = await supabase
    .from("strategy_card_usages")
    .insert({
      team_id: teamId,
      match_id: matchId,
      round_label: roundLabel,
      target_song_id: targetSongId ?? null,
      note: note ?? null,
    })
    .select("*")
    .single();

  if (error || !usage) {
    return NextResponse.json(
      {
        error: `ストラテジーカード使用記録の作成に失敗しました: ${error?.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ usage });
}
