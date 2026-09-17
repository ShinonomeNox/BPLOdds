import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service Role Keyを使うサーバー専用クライアント。RLSをバイパスするため、
// 認証・コイン付与などサーバー側で権限制御が完結する処理でのみ使う。
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URLまたはSUPABASE_SERVICE_ROLE_KEYが設定されていません",
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
