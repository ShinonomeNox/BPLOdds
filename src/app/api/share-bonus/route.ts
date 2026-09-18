import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { getTodayDateString } from "@/lib/date/today";

// 実際の投稿有無はXの公開APIでは検証できないため、
// 「シェアボタンを押した」ことをそのままトリガーに1日1回付与する（性善説運用）。
const SHARE_BONUS_COINS = 10;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  if (!user.shareBonusAvailable) {
    return NextResponse.json(
      { error: "本日分のシェアボーナスは受け取り済みです" },
      { status: 409 },
    );
  }

  const today = getTodayDateString();
  const newCoins = user.coins + SHARE_BONUS_COINS;

  const supabase = createServiceClient();
  const { error: updateError } = await supabase
    .from("users")
    .update({ coins: newCoins, last_share_bonus_date: today })
    .eq("id", user.userId);

  if (updateError) {
    return NextResponse.json(
      { error: `シェアボーナスの付与に失敗しました: ${updateError.message}` },
      { status: 500 },
    );
  }

  const { error: coinLogError } = await supabase.from("coin_logs").insert({
    user_id: user.userId,
    type: "share_bonus",
    amount: SHARE_BONUS_COINS,
  });

  if (coinLogError) {
    return NextResponse.json(
      { error: `コイン履歴の記録に失敗しました: ${coinLogError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ coins: newCoins });
}
