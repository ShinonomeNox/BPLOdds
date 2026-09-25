import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { hashPassword } from "@/lib/auth/password";
import { verifyRecaptchaToken } from "@/lib/recaptcha/verify";
import { getClientIp } from "@/lib/http/client-ip";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth/session";
import { getTodayDateString } from "@/lib/date/today";
import { getLoginBonusAmount } from "@/lib/coins/login-bonus";

const INITIAL_COINS = 1000;
const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
// 新規ドメインはGoogle側の行動データが少なく、実際のユーザー操作でも
// スコアが低めに出ることがあるため、標準的な0.5より緩めに設定している。
const RECAPTCHA_SCORE_THRESHOLD = 0.3;

interface RegisterRequestBody {
  loginId?: unknown;
  password?: unknown;
  recaptchaToken?: unknown;
}

export async function POST(request: Request) {
  const body = (await request.json()) as RegisterRequestBody;
  const { loginId, password, recaptchaToken } = body;

  if (typeof loginId !== "string" || !LOGIN_ID_PATTERN.test(loginId)) {
    return NextResponse.json(
      { error: "ログインIDは英数字とアンダースコアで3〜20文字にしてください" },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上にしてください" },
      { status: 400 },
    );
  }
  if (typeof recaptchaToken !== "string") {
    return NextResponse.json(
      { error: "reCAPTCHAトークンがありません" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);

  const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, ip);
  if (
    !recaptchaResult.success ||
    (recaptchaResult.score ?? 0) < RECAPTCHA_SCORE_THRESHOLD
  ) {
    return NextResponse.json(
      { error: "reCAPTCHA検証に失敗しました" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("id")
    .eq("login_id", loginId)
    .maybeSingle();

  if (existingUserError) {
    return NextResponse.json(
      { error: `ユーザー確認に失敗しました: ${existingUserError.message}` },
      { status: 500 },
    );
  }
  if (existingUser) {
    return NextResponse.json(
      { error: "このログインIDは既に使用されています" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const today = getTodayDateString();
  const bonusAmount = getLoginBonusAmount();
  const totalCoins = INITIAL_COINS + bonusAmount;

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      login_id: loginId,
      password_hash: passwordHash,
      coins: totalCoins,
      registered_ip: ip,
      last_login_bonus_date: today,
    })
    .select("id, login_id")
    .single();

  if (insertError || !newUser) {
    return NextResponse.json(
      {
        error: `登録に失敗しました: ${insertError?.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  const { error: coinLogError } = await supabase.from("coin_logs").insert([
    {
      user_id: newUser.id,
      type: "initial",
      amount: INITIAL_COINS,
    },
    {
      user_id: newUser.id,
      type: "login_bonus",
      amount: bonusAmount,
    },
  ]);

  if (coinLogError) {
    return NextResponse.json(
      { error: `コイン履歴の記録に失敗しました: ${coinLogError.message}` },
      { status: 500 },
    );
  }

  const token = await createSessionToken({
    userId: newUser.id,
    loginId: newUser.login_id,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return NextResponse.json({
    loginId: newUser.login_id,
    coins: totalCoins,
    bonusAmount,
  });
}
