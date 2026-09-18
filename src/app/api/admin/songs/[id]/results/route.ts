import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";

interface ResultInput {
  participantId?: unknown;
  rank?: unknown;
  rawScore?: unknown;
}

interface SubmitResultsRequestBody {
  results?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id: songId } = await params;
  const body = (await request.json()) as SubmitResultsRequestBody;
  const { results } = body;

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json(
      { error: "resultsは1件以上の配列で指定してください" },
      { status: 400 },
    );
  }

  const rows: {
    song_id: string;
    participant_id: string;
    rank: number | null;
    raw_score: number | null;
  }[] = [];

  for (const raw of results as ResultInput[]) {
    const { participantId, rank, rawScore } = raw;
    if (typeof participantId !== "string") {
      return NextResponse.json(
        { error: "各resultにparticipantIdを指定してください" },
        { status: 400 },
      );
    }
    if (rank !== undefined && rank !== null && typeof rank !== "number") {
      return NextResponse.json(
        { error: "rankは数値で指定してください" },
        { status: 400 },
      );
    }
    if (
      rawScore !== undefined &&
      rawScore !== null &&
      typeof rawScore !== "number"
    ) {
      return NextResponse.json(
        { error: "rawScoreは数値で指定してください" },
        { status: 400 },
      );
    }
    rows.push({
      song_id: songId,
      participant_id: participantId,
      rank: rank ?? null,
      raw_score: rawScore ?? null,
    });
  }

  const supabase = createServiceClient();
  const { data: inserted, error } = await supabase
    .from("song_results")
    .insert(rows)
    .select("*");

  if (error) {
    return NextResponse.json(
      { error: `結果の登録に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ results: inserted });
}
