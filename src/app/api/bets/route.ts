import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";

interface CreateBetRequestBody {
  betOptionId?: unknown;
  amount?: unknown;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = (await request.json()) as CreateBetRequestBody;
  const { betOptionId, amount } = body;

  if (typeof betOptionId !== "string") {
    return NextResponse.json(
      { error: "betOptionIdを指定してください" },
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

  const { data: betOption, error: betOptionError } = await supabase
    .from("bet_options")
    .select("id, bet_type_id")
    .eq("id", betOptionId)
    .maybeSingle();

  if (betOptionError) {
    return NextResponse.json(
      { error: `ベット選択肢の取得に失敗しました: ${betOptionError.message}` },
      { status: 500 },
    );
  }
  if (!betOption) {
    return NextResponse.json(
      { error: "指定されたベット選択肢が見つかりません" },
      { status: 404 },
    );
  }

  const { data: betType, error: betTypeError } = await supabase
    .from("bet_types")
    .select("match_id, song_id")
    .eq("id", betOption.bet_type_id)
    .maybeSingle();

  if (betTypeError || !betType) {
    return NextResponse.json(
      { error: "ベット種別の取得に失敗しました" },
      { status: 500 },
    );
  }

  if (betType.match_id) {
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("status")
      .eq("id", betType.match_id)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json(
        { error: "対象の試合が見つかりません" },
        { status: 404 },
      );
    }
    if (match.status !== "scheduled") {
      return NextResponse.json(
        { error: "この試合は既に締め切られています" },
        { status: 409 },
      );
    }
  }

  if (betType.song_id) {
    const { data: song, error: songError } = await supabase
      .from("tag_battle_songs")
      .select("status")
      .eq("id", betType.song_id)
      .maybeSingle();

    if (songError || !song) {
      return NextResponse.json(
        { error: "対象の曲が見つかりません" },
        { status: 404 },
      );
    }
    if (song.status !== "open") {
      return NextResponse.json(
        { error: "この曲のベットは既に締め切られています" },
        { status: 409 },
      );
    }
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
      { error: "コインが不足しています" },
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

  const { data: bet, error: betError } = await supabase
    .from("bets")
    .insert({
      user_id: user.userId,
      bet_option_id: betOptionId,
      amount,
    })
    .select("*")
    .single();

  if (betError || !bet) {
    return NextResponse.json(
      {
        error: `ベットの登録に失敗しました: ${betError?.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  const { error: coinLogError } = await supabase.from("coin_logs").insert({
    user_id: user.userId,
    type: "bet",
    amount: -amount,
    related_match_id: betType.match_id,
  });

  if (coinLogError) {
    return NextResponse.json(
      { error: `コイン履歴の記録に失敗しました: ${coinLogError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ bet, remainingCoins: currentUser.coins - amount });
}
