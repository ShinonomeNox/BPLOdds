import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { createMatchRound } from "@/lib/admin/create-match-round";
import { ROUND_NUMBER_TO_LABEL } from "@/lib/admin/parse-match-sheet";
import type { RoundFormat } from "@/types/database";

const ROUND_FORMATS: RoundFormat[] = [
  "single",
  "single_first_look",
  "single_with_first_look",
  "tag_score",
  "tag_trifecta",
  "megamix",
];

function requiresFourPlayers(format: RoundFormat): boolean {
  return format === "tag_score" || format === "tag_trifecta";
}

interface CreateRoundRequestBody {
  roundNumber?: unknown;
  roundFormat?: unknown;
  theme?: unknown;
  levelRange?: unknown;
  playerAName?: unknown;
  playerBName?: unknown;
  playerA2Name?: unknown;
  playerB2Name?: unknown;
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
  const body = (await request.json()) as CreateRoundRequestBody;
  const {
    roundNumber,
    roundFormat,
    theme,
    levelRange,
    playerAName,
    playerBName,
    playerA2Name,
    playerB2Name,
  } = body;

  if (
    typeof roundNumber !== "number" ||
    !ROUND_NUMBER_TO_LABEL[roundNumber]
  ) {
    return NextResponse.json(
      { error: "roundNumberは1〜8、またはFinal相当の値で指定してください" },
      { status: 400 },
    );
  }
  if (
    typeof roundFormat !== "string" ||
    !ROUND_FORMATS.includes(roundFormat as RoundFormat)
  ) {
    return NextResponse.json(
      { error: `roundFormatは${ROUND_FORMATS.join("/")}のいずれかで指定してください` },
      { status: 400 },
    );
  }
  if (typeof playerAName !== "string" || typeof playerBName !== "string") {
    return NextResponse.json(
      { error: "playerAName, playerBNameを指定してください" },
      { status: 400 },
    );
  }
  if (
    requiresFourPlayers(roundFormat as RoundFormat) &&
    (typeof playerA2Name !== "string" ||
      typeof playerB2Name !== "string" ||
      !playerA2Name ||
      !playerB2Name)
  ) {
    return NextResponse.json(
      { error: "このマッチにはplayerA2Name, playerB2Nameが必要です" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, game_title, team_a_id, team_b_id")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    return NextResponse.json({ error: "試合が見つかりません" }, { status: 404 });
  }

  try {
    const { roundId } = await createMatchRound(supabase, {
      matchId: match.id,
      gameTitle: match.game_title,
      teamAId: match.team_a_id,
      teamBId: match.team_b_id,
      roundNumber,
      roundLabel: ROUND_NUMBER_TO_LABEL[roundNumber],
      roundFormat: roundFormat as RoundFormat,
      theme: typeof theme === "string" ? theme || null : null,
      levelRange: typeof levelRange === "string" ? levelRange || null : null,
      playerAName,
      playerBName,
      playerA2Name: typeof playerA2Name === "string" ? playerA2Name || null : null,
      playerB2Name: typeof playerB2Name === "string" ? playerB2Name || null : null,
    });
    return NextResponse.json({ roundId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
