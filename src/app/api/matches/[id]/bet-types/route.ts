import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  try {
    const betTypes = await getBetTypesWithOptions(supabase, { matchId: id });
    return NextResponse.json({ betTypes });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "取得に失敗しました",
      },
      { status: 500 },
    );
  }
}
