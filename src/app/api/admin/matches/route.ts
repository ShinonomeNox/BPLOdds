import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildMatchLevelBetTypeDefs,
  MATCH_FORMAT_GAME_TITLE,
  MATCH_FORMATS,
  type MatchFormat,
} from "@/lib/betting/match-format";
import { resolveTeamIdBySide } from "@/lib/betting/side-to-team";

interface CreateMatchRequestBody {
  matchFormat?: unknown;
  teamAId?: unknown;
  teamBId?: unknown;
  startTime?: unknown;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: `試合一覧の取得に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ matches });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json()) as CreateMatchRequestBody;
  const { matchFormat, teamAId, teamBId, startTime } = body;

  if (
    typeof matchFormat !== "string" ||
    !MATCH_FORMATS.includes(matchFormat as MatchFormat)
  ) {
    return NextResponse.json(
      {
        error: `matchFormatは${MATCH_FORMATS.join("/")}のいずれかで指定してください`,
      },
      { status: 400 },
    );
  }
  if (typeof teamAId !== "string" || typeof teamBId !== "string") {
    return NextResponse.json(
      { error: "teamAId, teamBIdを指定してください" },
      { status: 400 },
    );
  }
  if (typeof startTime !== "string" || Number.isNaN(Date.parse(startTime))) {
    return NextResponse.json(
      { error: "startTimeはISO日時文字列で指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const gameTitle = MATCH_FORMAT_GAME_TITLE[matchFormat as MatchFormat];

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      game_title: gameTitle,
      team_a_id: teamAId,
      team_b_id: teamBId,
      start_time: startTime,
    })
    .select("*")
    .single();

  if (matchError || !match) {
    return NextResponse.json(
      {
        error: `試合の作成に失敗しました: ${matchError?.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  const betTypeDefs = buildMatchLevelBetTypeDefs(matchFormat as MatchFormat);

  for (const def of betTypeDefs) {
    const { data: betType, error: betTypeError } = await supabase
      .from("bet_types")
      .insert({ match_id: match.id, type_key: def.typeKey, label: def.label })
      .select("id")
      .single();

    if (betTypeError || !betType) {
      return NextResponse.json(
        {
          error: `ベット種別の作成に失敗しました: ${betTypeError?.message ?? "unknown error"}`,
        },
        { status: 500 },
      );
    }

    const { error: optionsError } = await supabase.from("bet_options").insert(
      def.options.map((option) => ({
        bet_type_id: betType.id,
        option_key: option.optionKey,
        label: option.label,
        min_diff: option.minDiff,
        max_diff: option.maxDiff,
        side: option.side,
        team_id: resolveTeamIdBySide(option.side, teamAId, teamBId),
      })),
    );

    if (optionsError) {
      return NextResponse.json(
        { error: `ベット選択肢の作成に失敗しました: ${optionsError.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ match });
}
