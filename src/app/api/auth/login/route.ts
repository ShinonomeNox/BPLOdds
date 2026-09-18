import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth/session";
import { getTodayDateString } from "@/lib/date/today";

const LOGIN_BONUS_COINS = 20;

interface LoginRequestBody {
  loginId?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoginRequestBody;
  const { loginId, password } = body;

  if (typeof loginId !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "ログインIDとパスワードを入力してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, login_id, password_hash, coins, last_login_bonus_date")
    .eq("login_id", loginId)
    .maybeSingle();

  if (userError) {
    return NextResponse.json(
      { error: `ログイン処理に失敗しました: ${userError.message}` },
      { status: 500 },
    );
  }
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: "ログインIDまたはパスワードが正しくありません" },
      { status: 401 },
    );
  }

  const today = getTodayDateString();
  let coins = user.coins;

  if (user.last_login_bonus_date !== today) {
    coins += LOGIN_BONUS_COINS;

    const { error: updateError } = await supabase
      .from("users")
      .update({ coins, last_login_bonus_date: today })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        {
          error: `ログインボーナスの付与に失敗しました: ${updateError.message}`,
        },
        { status: 500 },
      );
    }

    const { error: coinLogError } = await supabase.from("coin_logs").insert({
      user_id: user.id,
      type: "login_bonus",
      amount: LOGIN_BONUS_COINS,
    });

    if (coinLogError) {
      return NextResponse.json(
        { error: `コイン履歴の記録に失敗しました: ${coinLogError.message}` },
        { status: 500 },
      );
    }
  }

  const token = await createSessionToken({
    userId: user.id,
    loginId: user.login_id,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return NextResponse.json({ loginId: user.login_id, coins });
}
