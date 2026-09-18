import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getWinningTrifectas } from "@/lib/betting/dead-heat";
import { settleBetType } from "@/lib/betting/settle-bet-type";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id: songId } = await params;
  const supabase = createServiceClient();

  const { data: results, error: resultsError } = await supabase
    .from("song_results")
    .select("participant_id, rank")
    .eq("song_id", songId);

  if (resultsError) {
    return NextResponse.json(
      { error: `結果の取得に失敗しました: ${resultsError.message}` },
      { status: 500 },
    );
  }
  if (!results || results.some((r) => r.rank === null)) {
    return NextResponse.json(
      { error: "全出場選手の結果（rank）が入力されている必要があります" },
      { status: 400 },
    );
  }

  const winningTrifectas = getWinningTrifectas(
    results.map((r) => ({ id: r.participant_id, rank: r.rank as number })),
  );

  const { data: betType, error: betTypeError } = await supabase
    .from("bet_types")
    .select("id")
    .eq("song_id", songId)
    .eq("type_key", "trifecta")
    .maybeSingle();

  if (betTypeError || !betType) {
    return NextResponse.json(
      { error: "この曲の3連単ベット種別が見つかりません" },
      { status: 404 },
    );
  }

  const { data: winningOptions, error: optionsError } = await supabase
    .from("bet_options")
    .select("id, option_key")
    .eq("bet_type_id", betType.id)
    .in("option_key", winningTrifectas);

  if (optionsError) {
    return NextResponse.json(
      { error: `正解選択肢の特定に失敗しました: ${optionsError.message}` },
      { status: 500 },
    );
  }
  if (!winningOptions || winningOptions.length === 0) {
    return NextResponse.json(
      { error: "正解となる3連単の選択肢が見つかりませんでした" },
      { status: 500 },
    );
  }

  try {
    const result = await settleBetType(
      supabase,
      betType.id,
      winningOptions.map((option) => option.id),
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: `精算処理に失敗しました: ${error instanceof Error ? error.message : "unknown error"}`,
      },
      { status: 500 },
    );
  }
}
