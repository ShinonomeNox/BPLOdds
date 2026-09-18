import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const DEFAULT_YELL_BONUS_RATE = 0.1;

export async function addYellPoints(
  supabase: SupabaseClient<Database>,
  playerId: string,
  points: number,
): Promise<number> {
  const { data: existing, error: fetchError } = await supabase
    .from("player_yell_points")
    .select("total_points")
    .eq("player_id", playerId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(
      `エールポイントの取得に失敗しました: ${fetchError.message}`,
    );
  }

  const newTotal = (existing?.total_points ?? 0) + points;
  const { error: upsertError } = await supabase
    .from("player_yell_points")
    .upsert({
      player_id: playerId,
      total_points: newTotal,
      updated_at: new Date().toISOString(),
    });

  if (upsertError) {
    throw new Error(
      `エールポイントの加算に失敗しました: ${upsertError.message}`,
    );
  }

  return newTotal;
}

export async function addTeamYellPoints(
  supabase: SupabaseClient<Database>,
  teamId: string,
  points: number,
): Promise<number> {
  const { data: existing, error: fetchError } = await supabase
    .from("team_yell_points")
    .select("total_points")
    .eq("team_id", teamId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(
      `チームのエールポイント取得に失敗しました: ${fetchError.message}`,
    );
  }

  const newTotal = (existing?.total_points ?? 0) + points;
  const { error: upsertError } = await supabase.from("team_yell_points").upsert({
    team_id: teamId,
    total_points: newTotal,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    throw new Error(
      `チームのエールポイント加算に失敗しました: ${upsertError.message}`,
    );
  }

  return newTotal;
}

export async function getYellBonusRate(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "yell_point_bet_bonus_rate")
    .maybeSingle();

  const parsed = data ? Number(data.value) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_YELL_BONUS_RATE;
}
