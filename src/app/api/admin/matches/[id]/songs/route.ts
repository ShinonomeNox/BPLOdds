import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildDdrPairRankDiffBetOptions,
  buildTrifectaBetOptions,
} from "@/lib/betting/bet-option-builders";
import { resolveTeamIdBySide } from "@/lib/betting/side-to-team";

const SUPPORTED_SONG_BET_TYPES = ["trifecta", "ddr_pair_rank_diff"] as const;
type SongBetType = (typeof SUPPORTED_SONG_BET_TYPES)[number];

interface CreateSongRequestBody {
  songId?: unknown;
  songNumber?: unknown;
  betTypes?: unknown;
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
  const body = (await request.json()) as CreateSongRequestBody;
  const { songId, songNumber, betTypes } = body;

  if (typeof songNumber !== "number" || !Number.isInteger(songNumber)) {
    return NextResponse.json(
      { error: "songNumberは整数で指定してください" },
      { status: 400 },
    );
  }
  if (songId !== undefined && typeof songId !== "string") {
    return NextResponse.json(
      { error: "songIdは文字列で指定してください" },
      { status: 400 },
    );
  }
  if (
    !Array.isArray(betTypes) ||
    betTypes.length === 0 ||
    !betTypes.every((t) => SUPPORTED_SONG_BET_TYPES.includes(t))
  ) {
    return NextResponse.json(
      {
        error: `betTypesは${SUPPORTED_SONG_BET_TYPES.join("/")}を1つ以上含む配列で指定してください`,
      },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: song, error: songError } = await supabase
    .from("tag_battle_songs")
    .insert({ match_id: matchId, song_id: songId ?? null, song_number: songNumber })
    .select("*")
    .single();

  if (songError || !song) {
    return NextResponse.json(
      {
        error: `曲の登録に失敗しました: ${songError?.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  const requestedBetTypes = betTypes as SongBetType[];

  if (requestedBetTypes.includes("trifecta")) {
    const { data: participants, error: participantsError } = await supabase
      .from("match_participants")
      .select("id, player_id")
      .eq("match_id", matchId);

    if (participantsError || !participants || participants.length !== 4) {
      return NextResponse.json(
        {
          error:
            "3連単ベットの生成には出場選手が4人登録されている必要があります",
        },
        { status: 400 },
      );
    }

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name")
      .in(
        "id",
        participants.map((p) => p.player_id),
      );

    if (playersError) {
      return NextResponse.json(
        { error: `選手情報の取得に失敗しました: ${playersError.message}` },
        { status: 500 },
      );
    }

    const playerNameById = new Map(players.map((p) => [p.id, p.name]));
    const trifectaParticipants = participants.map((p) => ({
      id: p.id,
      name: playerNameById.get(p.player_id) ?? p.player_id,
    }));

    const { data: betType, error: betTypeError } = await supabase
      .from("bet_types")
      .insert({ song_id: song.id, type_key: "trifecta", label: "3連単" })
      .select("id")
      .single();

    if (betTypeError || !betType) {
      return NextResponse.json(
        {
          error: `3連単ベット種別の作成に失敗しました: ${betTypeError?.message ?? "unknown error"}`,
        },
        { status: 500 },
      );
    }

    const options = buildTrifectaBetOptions(trifectaParticipants);
    const { error: optionsError } = await supabase.from("bet_options").insert(
      options.map((option) => ({
        bet_type_id: betType.id,
        option_key: option.optionKey,
        label: option.label,
        min_diff: option.minDiff,
        max_diff: option.maxDiff,
        side: option.side,
      })),
    );

    if (optionsError) {
      return NextResponse.json(
        { error: `3連単選択肢の作成に失敗しました: ${optionsError.message}` },
        { status: 500 },
      );
    }
  }

  if (requestedBetTypes.includes("ddr_pair_rank_diff")) {
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("team_a_id, team_b_id")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { error: "試合情報の取得に失敗しました" },
        { status: 500 },
      );
    }

    const { data: betType, error: betTypeError } = await supabase
      .from("bet_types")
      .insert({
        song_id: song.id,
        type_key: "ddr_pair_rank_diff",
        label: "順位配点差",
      })
      .select("id")
      .single();

    if (betTypeError || !betType) {
      return NextResponse.json(
        {
          error: `順位配点ベット種別の作成に失敗しました: ${betTypeError?.message ?? "unknown error"}`,
        },
        { status: 500 },
      );
    }

    const options = buildDdrPairRankDiffBetOptions();
    const { error: optionsError } = await supabase.from("bet_options").insert(
      options.map((option) => ({
        bet_type_id: betType.id,
        option_key: option.optionKey,
        label: option.label,
        min_diff: option.minDiff,
        max_diff: option.maxDiff,
        side: option.side,
        team_id: resolveTeamIdBySide(
          option.side,
          match.team_a_id,
          match.team_b_id,
        ),
      })),
    );

    if (optionsError) {
      return NextResponse.json(
        {
          error: `順位配点選択肢の作成に失敗しました: ${optionsError.message}`,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ song });
}
