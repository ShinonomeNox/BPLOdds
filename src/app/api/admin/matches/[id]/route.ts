import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getMatchScopeIds } from "@/lib/admin/get-match-bet-option-ids";
import { deleteMatch } from "@/lib/admin/delete-match";
import type { MatchStatus } from "@/types/database";

const MATCH_STATUSES: MatchStatus[] = ["scheduled", "live", "settled"];

interface UpdateMatchRequestBody {
  status?: unknown;
  winnerTeamId?: unknown;
  teamAId?: unknown;
  teamBId?: unknown;
  startTime?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();
  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `試合の取得に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!match) {
    return NextResponse.json({ error: "試合が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ match });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateMatchRequestBody;
  const { status, winnerTeamId, teamAId, teamBId, startTime } = body;

  const supabase = createServiceClient();
  const update: {
    status?: MatchStatus;
    winner_team_id?: string | null;
    team_a_id?: string;
    team_b_id?: string;
    start_time?: string;
  } = {};

  if (status !== undefined) {
    if (
      typeof status !== "string" ||
      !MATCH_STATUSES.includes(status as MatchStatus)
    ) {
      return NextResponse.json(
        { error: "statusはscheduled/live/settledのいずれかで指定してください" },
        { status: 400 },
      );
    }
    update.status = status as MatchStatus;
  }
  if (winnerTeamId !== undefined) {
    if (winnerTeamId !== null && typeof winnerTeamId !== "string") {
      return NextResponse.json(
        { error: "winnerTeamIdは文字列で指定してください" },
        { status: 400 },
      );
    }
    update.winner_team_id = winnerTeamId;
  }
  if (startTime !== undefined) {
    if (typeof startTime !== "string" || Number.isNaN(Date.parse(startTime))) {
      return NextResponse.json(
        { error: "startTimeはISO日時文字列で指定してください" },
        { status: 400 },
      );
    }
    update.start_time = startTime;
  }
  if (teamAId !== undefined || teamBId !== undefined) {
    if (typeof teamAId !== "string" || typeof teamBId !== "string") {
      return NextResponse.json(
        { error: "teamAId, teamBIdは両方とも文字列で指定してください" },
        { status: 400 },
      );
    }
    const { betOptionIds } = await getMatchScopeIds(supabase, id);
    if (betOptionIds.length > 0) {
      const { count } = await supabase
        .from("bets")
        .select("id", { count: "exact", head: true })
        .in("bet_option_id", betOptionIds);
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          {
            error:
              "この試合には既に賭けが発生しているため、チームを変更できません。削除して作り直してください",
          },
          { status: 409 },
        );
      }
    }
    update.team_a_id = teamAId;
    update.team_b_id = teamBId;
  }

  const { data: match, error } = await supabase
    .from("matches")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `試合の更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!match) {
    return NextResponse.json({ error: "試合が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ match });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  const supabase = createServiceClient();
  try {
    const result = await deleteMatch(supabase, id, force);
    if (result.blocked) {
      return NextResponse.json(
        {
          error: `精算済みの賭け履歴が${result.settledCount}件あります。本当に削除する場合はforce=trueを付けてください`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
