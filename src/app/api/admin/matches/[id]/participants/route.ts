import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { linkMatchBetOptionsToPlayers } from "@/lib/betting/link-bet-options-to-players";
import type { TeamSide } from "@/types/database";

const TEAM_SIDES: TeamSide[] = ["a", "b"];

interface ParticipantInput {
  playerId?: unknown;
  teamSide?: unknown;
}

interface AddParticipantsRequestBody {
  participants?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as AddParticipantsRequestBody;
  const { participants } = body;

  if (!Array.isArray(participants) || participants.length === 0) {
    return NextResponse.json(
      { error: "participantsは1件以上の配列で指定してください" },
      { status: 400 },
    );
  }

  const rows: { match_id: string; player_id: string; team_side: TeamSide }[] =
    [];
  for (const raw of participants as ParticipantInput[]) {
    const { playerId, teamSide } = raw;
    if (typeof playerId !== "string") {
      return NextResponse.json(
        { error: "各participantにplayerIdを指定してください" },
        { status: 400 },
      );
    }
    if (typeof teamSide !== "string" || !TEAM_SIDES.includes(teamSide as TeamSide)) {
      return NextResponse.json(
        { error: "各participantのteamSideはa/bで指定してください" },
        { status: 400 },
      );
    }
    rows.push({ match_id: id, player_id: playerId, team_side: teamSide as TeamSide });
  }

  const supabase = createServiceClient();
  const { data: inserted, error } = await supabase
    .from("match_participants")
    .insert(rows)
    .select("*");

  if (error) {
    return NextResponse.json(
      { error: `出場選手の登録に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  try {
    await linkMatchBetOptionsToPlayers(supabase, id);
  } catch (linkError) {
    return NextResponse.json(
      {
        error:
          linkError instanceof Error ? linkError.message : "unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ participants: inserted });
}
