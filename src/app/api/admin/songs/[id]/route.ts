import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { SongStatus } from "@/types/database";

const SONG_STATUSES: SongStatus[] = ["open", "closed", "settled"];

interface UpdateSongRequestBody {
  status?: unknown;
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
  const body = (await request.json()) as UpdateSongRequestBody;
  const { status } = body;

  if (typeof status !== "string" || !SONG_STATUSES.includes(status as SongStatus)) {
    return NextResponse.json(
      { error: "statusはopen/closed/settledのいずれかで指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: song, error } = await supabase
    .from("tag_battle_songs")
    .update({ status: status as SongStatus })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `曲ステータスの更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }
  if (!song) {
    return NextResponse.json({ error: "曲が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ song });
}
