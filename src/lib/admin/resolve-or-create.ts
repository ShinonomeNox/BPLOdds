import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, GameTitle } from "@/types/database";

export async function resolveOrCreateTeam(
  supabase: SupabaseClient<Database>,
  name: string,
  gameTitle: GameTitle,
): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("teams")
    .select("id")
    .eq("name", name)
    .eq("game_title", gameTitle)
    .maybeSingle();

  if (findError) {
    throw new Error(`チーム「${name}」の検索に失敗しました: ${findError.message}`);
  }
  if (existing) {
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("teams")
    .insert({ name, game_title: gameTitle })
    .select("id")
    .single();

  if (insertError || !created) {
    throw new Error(
      `チーム「${name}」の作成に失敗しました: ${insertError?.message ?? "unknown error"}`,
    );
  }
  return created.id;
}

export async function resolveOrCreatePlayer(
  supabase: SupabaseClient<Database>,
  name: string,
  gameTitle: GameTitle,
  teamId: string,
): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("players")
    .select("id")
    .eq("name", name)
    .eq("game_title", gameTitle)
    .maybeSingle();

  if (findError) {
    throw new Error(`選手「${name}」の検索に失敗しました: ${findError.message}`);
  }
  if (existing) {
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("players")
    .insert({ name, game_title: gameTitle, team_id: teamId })
    .select("id")
    .single();

  if (insertError || !created) {
    throw new Error(
      `選手「${name}」の作成に失敗しました: ${insertError?.message ?? "unknown error"}`,
    );
  }
  return created.id;
}
