import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { parseMatchSheet } from "@/lib/admin/parse-match-sheet";
import { resolveOrCreateTeam } from "@/lib/admin/resolve-or-create";
import { createMatchRound } from "@/lib/admin/create-match-round";
import { buildMatchLevelBetTypeDefs } from "@/lib/betting/match-format";
import { resolveTeamIdBySide } from "@/lib/betting/side-to-team";
import type { GameTitle } from "@/types/database";

interface BulkImportRequestBody {
  text?: unknown;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json()) as BulkImportRequestBody;
  const { text } = body;

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "textを指定してください" },
      { status: 400 },
    );
  }

  let parsed;
  try {
    parsed = parseMatchSheet(text);
  } catch (parseError) {
    return NextResponse.json(
      {
        error:
          parseError instanceof Error ? parseError.message : "パースに失敗しました",
      },
      { status: 400 },
    );
  }

  if (!parsed.gameKey) {
    return NextResponse.json(
      { error: "「Game」の行が見つかりません" },
      { status: 400 },
    );
  }
  if (!parsed.teamAName || !parsed.teamBName) {
    return NextResponse.json(
      { error: "「Team A」「Team B」の行が見つかりません" },
      { status: 400 },
    );
  }
  if (parsed.blocks.length === 0) {
    return NextResponse.json(
      { error: "機種ブロック（IIDX/SDVX/DDR）が見つかりません" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: schedule, error: scheduleError } = await supabase
    .from("game_schedules")
    .select("start_time")
    .eq("game_key", parsed.gameKey)
    .maybeSingle();

  if (scheduleError) {
    return NextResponse.json(
      { error: `試合日程の取得に失敗しました: ${scheduleError.message}` },
      { status: 500 },
    );
  }
  if (!schedule) {
    return NextResponse.json(
      {
        error: `Game「${parsed.gameKey}」の日程が試合日程管理に登録されていません。先に登録してください`,
      },
      { status: 400 },
    );
  }
  const startTime = schedule.start_time;
  const results: { gameTitle: GameTitle; matchId: string }[] = [];
  const errors: string[] = [];

  for (const block of parsed.blocks) {
    const gameLabel = block.gameTitle.toUpperCase();
    try {
      const teamAId = await resolveOrCreateTeam(
        supabase,
        parsed.teamAName,
        block.gameTitle,
      );
      const teamBId = await resolveOrCreateTeam(
        supabase,
        parsed.teamBName,
        block.gameTitle,
      );

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          game_title: block.gameTitle,
          team_a_id: teamAId,
          team_b_id: teamBId,
          start_time: startTime,
          game_key: parsed.gameKey,
        })
        .select("id")
        .single();

      if (matchError || !match) {
        errors.push(
          `${gameLabel}: 試合の作成に失敗しました: ${matchError?.message ?? "unknown error"}`,
        );
        continue;
      }

      const betTypeDefs = buildMatchLevelBetTypeDefs(block.gameTitle, {
        a: parsed.teamAName,
        b: parsed.teamBName,
      });
      for (const def of betTypeDefs) {
        const { data: betType, error: betTypeError } = await supabase
          .from("bet_types")
          .insert({
            match_id: match.id,
            type_key: def.typeKey,
            label: def.label,
          })
          .select("id")
          .single();

        if (betTypeError || !betType) {
          errors.push(`${gameLabel}: ベット種別の作成に失敗しました`);
          continue;
        }

        const { error: optionsError } = await supabase
          .from("bet_options")
          .insert(
            def.options.map((option, index) => ({
              bet_type_id: betType.id,
              option_key: option.optionKey,
              label: option.label,
              sub_label: option.subLabel ?? null,
              min_diff: option.minDiff,
              max_diff: option.maxDiff,
              side: option.side,
              team_id: resolveTeamIdBySide(option.side, teamAId, teamBId),
              sort_order: index,
            })),
          );

        if (optionsError) {
          errors.push(`${gameLabel}: ベット選択肢の作成に失敗しました`);
        }
      }

      for (const song of block.songs) {
        try {
          await createMatchRound(supabase, {
            matchId: match.id,
            gameTitle: block.gameTitle,
            teamAId,
            teamBId,
            roundNumber: song.roundNumber,
            roundLabel: song.order,
            roundFormat: song.roundFormat,
            theme: song.theme || null,
            levelRange: song.levelRange || null,
            playerAName: song.playerA,
            playerBName: song.playerB,
            playerA2Name: song.playerA2,
            playerB2Name: song.playerB2,
          });
        } catch (roundError) {
          errors.push(
            `${gameLabel}: ${roundError instanceof Error ? roundError.message : "unknown error"}`,
          );
        }
      }

      results.push({ gameTitle: block.gameTitle, matchId: match.id });
    } catch (blockError) {
      errors.push(
        `${gameLabel}: ${blockError instanceof Error ? blockError.message : "unknown error"}`,
      );
    }
  }

  return NextResponse.json({ matches: results, errors });
}
