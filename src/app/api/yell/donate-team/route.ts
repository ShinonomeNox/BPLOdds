import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { addTeamYellPoints } from "@/lib/betting/yell-points";

interface DonateTeamRequestBody {
  teamId?: unknown;
  amount?: unknown;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = (await request.json()) as DonateTeamRequestBody;
  const { teamId, amount } = body;

  if (typeof teamId !== "string") {
    return NextResponse.json(
      { error: "teamIdを指定してください" },
      { status: 400 },
    );
  }
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amountは正の整数で指定してください" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError || !team) {
    return NextResponse.json(
      { error: "指定されたチームが見つかりません" },
      { status: 404 },
    );
  }

  const { data: currentUser, error: userError } = await supabase
    .from("users")
    .select("coins")
    .eq("id", user.userId)
    .single();

  if (userError || !currentUser) {
    return NextResponse.json(
      { error: "ユーザー情報の取得に失敗しました" },
      { status: 500 },
    );
  }
  if (currentUser.coins < amount) {
    return NextResponse.json(
      { error: "エールコインが不足しています" },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ coins: currentUser.coins - amount })
    .eq("id", user.userId);

  if (updateError) {
    return NextResponse.json(
      { error: `コインの減算に失敗しました: ${updateError.message}` },
      { status: 500 },
    );
  }

  const { error: coinLogError } = await supabase.from("coin_logs").insert({
    user_id: user.userId,
    type: "yell_donation",
    amount: -amount,
  });

  if (coinLogError) {
    return NextResponse.json(
      { error: `コイン履歴の記録に失敗しました: ${coinLogError.message}` },
      { status: 500 },
    );
  }

  const { error: donationError } = await supabase
    .from("yell_donations")
    .insert({ user_id: user.userId, team_id: teamId, amount });

  if (donationError) {
    return NextResponse.json(
      { error: `直エール履歴の記録に失敗しました: ${donationError.message}` },
      { status: 500 },
    );
  }

  try {
    const totalPoints = await addTeamYellPoints(supabase, teamId, amount);
    return NextResponse.json({
      remainingCoins: currentUser.coins - amount,
      teamTotalPoints: totalPoints,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
