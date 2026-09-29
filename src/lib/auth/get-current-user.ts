import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { getTodayDateString } from "@/lib/date/today";
import { getLoginBonusAmount } from "@/lib/coins/login-bonus";

export interface CurrentUser {
  userId: string;
  loginId: string;
  coins: number;
  shareBonusAvailable: boolean;
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
    .select("id, login_id, coins, last_share_bonus_date, last_login_bonus_date")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !user) {
    return null;
  }

  let coins = user.coins;
  const today = getTodayDateString();

  // ログインが残っている（セッション継続中の）状態でも、日付が変わって
  // 最初にアクセスしたタイミングでログインボーナスを付与する。
  if (user.last_login_bonus_date !== today) {
    const bonusAmount = getLoginBonusAmount();
    coins += bonusAmount;

    const { error: updateError } = await supabase
      .from("users")
      .update({ coins, last_login_bonus_date: today })
      .eq("id", user.id);

    if (!updateError) {
      await supabase.from("coin_logs").insert({
        user_id: user.id,
        type: "login_bonus",
        amount: bonusAmount,
      });
    } else {
      coins = user.coins;
    }
  }

  return {
    userId: user.id,
    loginId: user.login_id,
    coins,
    shareBonusAvailable: user.last_share_bonus_date !== today,
  };
}
