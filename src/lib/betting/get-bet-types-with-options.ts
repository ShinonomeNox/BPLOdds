import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function getBetTypesWithOptions(
  supabase: SupabaseClient<Database>,
  filter: { matchId?: string; songId?: string },
) {
  let query = supabase.from("bet_types").select("*");
  if (filter.matchId) {
    query = query.eq("match_id", filter.matchId);
  }
  if (filter.songId) {
    query = query.eq("song_id", filter.songId);
  }

  const { data: betTypes, error: betTypesError } = await query;
  if (betTypesError) {
    throw new Error(
      `ベット種別の取得に失敗しました: ${betTypesError.message}`,
    );
  }

  const betTypeIds = betTypes.map((betType) => betType.id);
  const { data: betOptions, error: betOptionsError } = await supabase
    .from("bet_options")
    .select("*")
    .in("bet_type_id", betTypeIds.length > 0 ? betTypeIds : [""]);

  if (betOptionsError) {
    throw new Error(
      `ベット選択肢の取得に失敗しました: ${betOptionsError.message}`,
    );
  }

  return betTypes.map((betType) => ({
    ...betType,
    options: betOptions.filter((option) => option.bet_type_id === betType.id),
  }));
}
