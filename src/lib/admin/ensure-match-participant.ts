import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, GameTitle, TeamSide } from "@/types/database";
import { resolveOrCreatePlayer } from "@/lib/admin/resolve-or-create";

// 選手を解決（無ければ作成）した上で、match_participantsにupsertする。
// 同一選手が複数ラウンドに出場しても1行のみ登録される
// （match_participants_match_player_uniqueに依存）。
export async function ensureMatchParticipant(
  supabase: SupabaseClient<Database>,
  matchId: string,
  gameTitle: GameTitle,
  playerName: string,
  teamId: string,
  teamSide: TeamSide,
): Promise<{ playerId: string; participantId: string }> {
  const playerId = await resolveOrCreatePlayer(
    supabase,
    playerName,
    gameTitle,
    teamId,
  );

  const { data, error } = await supabase
    .from("match_participants")
    .upsert(
      { match_id: matchId, player_id: playerId, team_side: teamSide },
      { onConflict: "match_id,player_id" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `出場登録「${playerName}」に失敗しました: ${error?.message ?? "unknown error"}`,
    );
  }

  return { playerId, participantId: data.id };
}
