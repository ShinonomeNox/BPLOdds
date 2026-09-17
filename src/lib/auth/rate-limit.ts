import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const REGISTRATION_WINDOW_MS = 60 * 60 * 1000; // 1時間
const REGISTRATION_LIMIT_PER_IP = 3;

export async function isRegistrationRateLimited(
  supabase: SupabaseClient<Database>,
  ip: string,
): Promise<boolean> {
  const since = new Date(Date.now() - REGISTRATION_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("registered_ip", ip)
    .gte("created_at", since);

  if (error) {
    throw new Error(`登録レート制限チェックに失敗しました: ${error.message}`);
  }

  return (count ?? 0) >= REGISTRATION_LIMIT_PER_IP;
}
