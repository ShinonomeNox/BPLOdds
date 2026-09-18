import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import type { CoinLogType, PayoutStatus } from "@/types/database";

const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: "結果待ち",
  won: "的中",
  lost: "はずれ",
};

const COIN_LOG_TYPE_LABEL: Record<CoinLogType, string> = {
  initial: "初期付与",
  login_bonus: "ログインボーナス",
  share_bonus: "シェアボーナス",
  bet: "エール送信",
  payout: "エール還元",
  yell_donation: "直エール",
  admin_adjust: "運営調整",
};

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = createServiceClient();

  const [{ data: bets }, { data: coinLogs }] = await Promise.all([
    supabase
      .from("bets")
      .select(
        "id, bet_option_id, amount, payout_status, payout_amount, created_at",
      )
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("coin_logs")
      .select("id, type, amount, created_at")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false }),
  ]);

  const optionIds = (bets ?? []).map((bet) => bet.bet_option_id);
  const { data: options } = await supabase
    .from("bet_options")
    .select("id, label")
    .in("id", optionIds.length > 0 ? optionIds : [""]);
  const optionLabelById = new Map((options ?? []).map((o) => [o.id, o.label]));

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold">マイページ</h1>
        <p className="text-sm text-gray-500">
          {user.loginId} さん / 所持エールコイン: {user.coins} EC
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">エール履歴</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-1">対象</th>
              <th className="pb-1">枚数</th>
              <th className="pb-1">状態</th>
              <th className="pb-1">還元</th>
              <th className="pb-1">日時</th>
            </tr>
          </thead>
          <tbody>
            {(bets ?? []).map((bet) => (
              <tr key={bet.id} className="border-t">
                <td className="py-1">
                  {optionLabelById.get(bet.bet_option_id) ?? "-"}
                </td>
                <td className="py-1">{bet.amount} EC</td>
                <td className="py-1">
                  {PAYOUT_STATUS_LABEL[bet.payout_status]}
                </td>
                <td className="py-1">{bet.payout_amount ?? "-"}</td>
                <td className="py-1 text-xs text-gray-400">
                  {new Date(bet.created_at).toLocaleString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(bets ?? []).length === 0 && (
          <p className="text-sm text-gray-400">
            エール送信履歴はまだありません
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">コイン増減履歴</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-1">種別</th>
              <th className="pb-1">増減</th>
              <th className="pb-1">日時</th>
            </tr>
          </thead>
          <tbody>
            {(coinLogs ?? []).map((log) => (
              <tr key={log.id} className="border-t">
                <td className="py-1">
                  {COIN_LOG_TYPE_LABEL[log.type] ?? log.type}
                </td>
                <td
                  className={`py-1 ${log.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {log.amount >= 0 ? "+" : ""}
                  {log.amount} EC
                </td>
                <td className="py-1 text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(coinLogs ?? []).length === 0 && (
          <p className="text-sm text-gray-400">履歴はまだありません</p>
        )}
      </section>
    </main>
  );
}
