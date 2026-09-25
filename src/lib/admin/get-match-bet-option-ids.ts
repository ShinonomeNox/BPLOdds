import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface MatchScopeIds {
  roundIds: string[];
  songIds: string[];
  betTypeIds: string[];
  betOptionIds: string[];
}

// 試合(matches)に紐づく全ラウンド・曲・ベット種別・ベット選択肢のidを収集する。
// 対象は「試合単位(match_id)」「ラウンド単位(round_id)」「曲単位(song_id、ラウンド配下)」の3種。
export async function getMatchScopeIds(
  supabase: SupabaseClient<Database>,
  matchId: string,
): Promise<MatchScopeIds> {
  const [{ data: rounds }, { data: songs }] = await Promise.all([
    supabase.from("match_rounds").select("id").eq("match_id", matchId),
    supabase.from("tag_battle_songs").select("id").eq("match_id", matchId),
  ]);

  const roundIds = (rounds ?? []).map((r) => r.id);
  const songIds = (songs ?? []).map((s) => s.id);

  const { data: betTypes, error: betTypesError } = await supabase
    .from("bet_types")
    .select("id")
    .or(
      [
        `match_id.eq.${matchId}`,
        roundIds.length > 0 ? `round_id.in.(${roundIds.join(",")})` : null,
        songIds.length > 0 ? `song_id.in.(${songIds.join(",")})` : null,
      ]
        .filter(Boolean)
        .join(","),
    );

  if (betTypesError) {
    throw new Error(`ベット種別の取得に失敗しました: ${betTypesError.message}`);
  }

  const betTypeIds = (betTypes ?? []).map((b) => b.id);
  if (betTypeIds.length === 0) {
    return { roundIds, songIds, betTypeIds, betOptionIds: [] };
  }

  const { data: betOptions, error: betOptionsError } = await supabase
    .from("bet_options")
    .select("id")
    .in("bet_type_id", betTypeIds);

  if (betOptionsError) {
    throw new Error(
      `ベット選択肢の取得に失敗しました: ${betOptionsError.message}`,
    );
  }

  return {
    roundIds,
    songIds,
    betTypeIds,
    betOptionIds: (betOptions ?? []).map((o) => o.id),
  };
}
