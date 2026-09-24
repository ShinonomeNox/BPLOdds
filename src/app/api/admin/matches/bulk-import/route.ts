import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { parseMatchSheet } from "@/lib/admin/parse-match-sheet";
import {
  resolveOrCreatePlayer,
  resolveOrCreateTeam,
} from "@/lib/admin/resolve-or-create";
import {
  buildMatchLevelBetTypeDefs,
  DEFAULT_MATCH_FORMAT_BY_GAME_TITLE,
} from "@/lib/betting/match-format";
import { resolveTeamIdBySide } from "@/lib/betting/side-to-team";
import type { GameTitle, TeamSide } from "@/types/database";

interface BulkImportRequestBody {
  text?: unknown;
  startTime?: unknown;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = (await request.json()) as BulkImportRequestBody;
  const { text, startTime } = body;

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "textを指定してください" },
      { status: 400 },
    );
  }
  if (typeof startTime !== "string" || Number.isNaN(Date.parse(startTime))) {
    return NextResponse.json(
      { error: "startTimeはISO日時文字列で指定してください" },
      { status: 400 },
    );
  }

  const parsed = parseMatchSheet(text);
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
        })
        .select("id")
        .single();

      if (matchError || !match) {
        errors.push(
          `${gameLabel}: 試合の作成に失敗しました: ${matchError?.message ?? "unknown error"}`,
        );
        continue;
      }

      const matchFormat = DEFAULT_MATCH_FORMAT_BY_GAME_TITLE[block.gameTitle];
      const betTypeDefs = buildMatchLevelBetTypeDefs(matchFormat);

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
          errors.push(`${gameLabel}: ベット選択肢の作成に失敗しました`);
        }
      }

      const playerSideByName = new Map<string, TeamSide>();
      for (const song of block.songs) {
        if (song.playerA) playerSideByName.set(song.playerA, "a");
        if (song.playerA2) playerSideByName.set(song.playerA2, "a");
        if (song.playerB) playerSideByName.set(song.playerB, "b");
        if (song.playerB2) playerSideByName.set(song.playerB2, "b");
      }

      const participantRows: { player_id: string; team_side: TeamSide }[] =
        [];
      for (const [playerName, side] of playerSideByName) {
        const teamId = side === "a" ? teamAId : teamBId;
        const playerId = await resolveOrCreatePlayer(
          supabase,
          playerName,
          block.gameTitle,
          teamId,
        );
        participantRows.push({ player_id: playerId, team_side: side });
      }

      if (participantRows.length > 0) {
        const { error: participantsError } = await supabase
          .from("match_participants")
          .insert(
            participantRows.map((p) => ({
              match_id: match.id,
              player_id: p.player_id,
              team_side: p.team_side,
            })),
          );
        if (participantsError) {
          errors.push(
            `${gameLabel}: 出場選手の登録に失敗しました: ${participantsError.message}`,
          );
        }
      }

      if (block.songs.length > 0) {
        const { error: songsError } = await supabase
          .from("tag_battle_songs")
          .insert(
            block.songs.map((song, index) => ({
              match_id: match.id,
              song_number: index + 1,
              theme: song.theme || null,
              level_range: song.levelRange || null,
            })),
          );
        if (songsError) {
          errors.push(`${gameLabel}: 曲の登録に失敗しました: ${songsError.message}`);
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
