import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

export interface CurrentUser {
  loginId: string;
  coins: number;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return null;
  }

  const supabase = createServiceClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("login_id, coins")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !user) {
    return null;
  }

  return { loginId: user.login_id, coins: user.coins };
}
