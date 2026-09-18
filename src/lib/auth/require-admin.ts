import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

export interface AdminUser {
  userId: string;
  loginId: string;
}

export async function requireAdmin(): Promise<AdminUser | null> {
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
    .select("is_admin")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !user || !user.is_admin) {
    return null;
  }

  return { userId: session.userId, loginId: session.loginId };
}
