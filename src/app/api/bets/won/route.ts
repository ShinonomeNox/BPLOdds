import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ wins: [] });
  }

  const supabase = createServiceClient();

  const { data: bets, error } = await supabase
    .from("bets")
    .select("id, amount, payout_amount")
    .eq("user_id", user.userId)
    .eq("payout_status", "won");

  if (error) {
    return NextResponse.json(
      { error: `ベット一覧の取得に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    wins: bets.map((bet) => ({
      id: bet.id,
      amount: bet.amount,
      payoutAmount: bet.payout_amount ?? 0,
    })),
  });
}
