import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { formatGameLabel } from "@/lib/betting/format-game-label";
import type { CoinLogType, PayoutStatus } from "@/types/database";

const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: "結果待ち",
  won: "的中",
  lost: "はずれ",
  voided: "取消（返金済み）",
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

  const [{ data: bets }, { data: coinLogs }, { data: donations }] =
    await Promise.all([
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
      supabase
        .from("yell_donations")
        .select("id, player_id, team_id, amount, created_at")
        .eq("user_id", user.userId)
        .order("created_at", { ascending: false }),
    ]);

  const optionIds = (bets ?? []).map((bet) => bet.bet_option_id);
  const { data: options } = await supabase
    .from("bet_options")
    .select("id, label, sub_label, bet_type_id")
    .in("id", optionIds.length > 0 ? optionIds : [""]);
  const optionById = new Map((options ?? []).map((o) => [o.id, o]));

  const betTypeIds = [...new Set((options ?? []).map((o) => o.bet_type_id))];
  const { data: betTypes } = await supabase
    .from("bet_types")
    .select("id, match_id, round_id, song_id")
    .in("id", betTypeIds.length > 0 ? betTypeIds : [""]);

  const roundIds = [
    ...new Set(
      (betTypes ?? []).map((bt) => bt.round_id).filter((v): v is string => !!v),
    ),
  ];
  const songIds = [
    ...new Set(
      (betTypes ?? []).map((bt) => bt.song_id).filter((v): v is string => !!v),
    ),
  ];

  const [{ data: betTypeRounds }, { data: betTypeSongs }] = await Promise.all([
    supabase
      .from("match_rounds")
      .select("id, match_id")
      .in("id", roundIds.length > 0 ? roundIds : [""]),
    supabase
      .from("tag_battle_songs")
      .select("id, match_id, round_id")
      .in("id", songIds.length > 0 ? songIds : [""]),
  ]);
  const roundById = new Map((betTypeRounds ?? []).map((r) => [r.id, r]));
  const songById = new Map((betTypeSongs ?? []).map((s) => [s.id, s]));

  // bet_type -> {matchId, roundId}（match単位/ラウンド単位/曲単位のいずれか）を解決
  const matchContextByBetTypeId = new Map<
    string,
    { matchId: string; roundId: string | null }
  >();
  for (const bt of betTypes ?? []) {
    if (bt.match_id) {
      matchContextByBetTypeId.set(bt.id, { matchId: bt.match_id, roundId: null });
    } else if (bt.round_id) {
      const round = roundById.get(bt.round_id);
      if (round) {
        matchContextByBetTypeId.set(bt.id, {
          matchId: round.match_id,
          roundId: bt.round_id,
        });
      }
    } else if (bt.song_id) {
      const song = songById.get(bt.song_id);
      if (song) {
        matchContextByBetTypeId.set(bt.id, {
          matchId: song.match_id,
          roundId: song.round_id,
        });
      }
    }
  }

  const matchIds = [
    ...new Set([...matchContextByBetTypeId.values()].map((c) => c.matchId)),
  ];
  const { data: matches } = await supabase
    .from("matches")
    .select("id, game_title, game_key")
    .in("id", matchIds.length > 0 ? matchIds : [""]);
  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));

  const donatedPlayerIds = (donations ?? [])
    .map((d) => d.player_id)
    .filter((id): id is string => id !== null);
  const donatedTeamIds = (donations ?? [])
    .map((d) => d.team_id)
    .filter((id): id is string => id !== null);
  const [{ data: donatedPlayers }, { data: donatedTeams }] = await Promise.all(
    [
      supabase
        .from("players")
        .select("id, name")
        .in("id", donatedPlayerIds.length > 0 ? donatedPlayerIds : [""]),
      supabase
        .from("teams")
        .select("id, name")
        .in("id", donatedTeamIds.length > 0 ? donatedTeamIds : [""]),
    ],
  );
  const playerNameById = new Map(
    (donatedPlayers ?? []).map((p) => [p.id, p.name]),
  );
  const teamNameById = new Map((donatedTeams ?? []).map((t) => [t.id, t.name]));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="card-surface mb-6 p-5 sm:p-6">
        <h1 className="glow-text text-xl font-bold text-foreground sm:text-2xl">
          マイページ
        </h1>
        <p className="mt-1 text-sm text-muted">
          {user.loginId} さん / 所持エールコイン:{" "}
          <span className="font-bold text-accent-cyan">{user.coins}</span> EC
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            エール履歴
          </h2>
          <div className="h-[26rem] overflow-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="sticky top-0 bg-surface text-left text-muted">
                  <th className="pb-2 font-medium">対象</th>
                  <th className="pb-2 font-medium">枚数</th>
                  <th className="pb-2 font-medium">状態</th>
                  <th className="pb-2 font-medium">還元</th>
                  <th className="pb-2 font-medium">日時</th>
                </tr>
              </thead>
              <tbody>
                {(bets ?? []).map((bet) => {
                  const option = optionById.get(bet.bet_option_id);
                  const context = option
                    ? matchContextByBetTypeId.get(option.bet_type_id)
                    : undefined;
                  const match = context ? matchById.get(context.matchId) : undefined;
                  const gameLabel = match ? formatGameLabel(match.game_key) : null;
                  const href = context
                    ? context.roundId
                      ? `/matches/${context.matchId}?round=${context.roundId}`
                      : `/matches/${context.matchId}`
                    : null;
                  const target = (
                    <>
                      {match && (
                        <p className="text-xs text-muted">
                          {gameLabel ? `${gameLabel} ` : ""}
                          {match.game_title.toUpperCase()}
                        </p>
                      )}
                      <p>
                        {option?.label ?? "-"}
                        {option?.sub_label && (
                          <span className="text-muted">（{option.sub_label}）</span>
                        )}
                      </p>
                    </>
                  );
                  return (
                    <tr key={bet.id} className="border-t border-border">
                      <td className="py-2 text-foreground">
                        {href ? (
                          <Link href={href} className="hover:underline">
                            {target}
                          </Link>
                        ) : (
                          target
                        )}
                      </td>
                      <td className="py-2 text-foreground">{bet.amount} EC</td>
                      <td className="py-2 text-foreground">
                        {PAYOUT_STATUS_LABEL[bet.payout_status]}
                      </td>
                      <td className="py-2 text-foreground">
                        {bet.payout_amount ?? "-"}
                      </td>
                      <td className="py-2 text-xs text-muted">
                        {new Date(bet.created_at).toLocaleString("ja-JP")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(bets ?? []).length === 0 && (
              <p className="text-sm text-muted">
                エール送信履歴はまだありません
              </p>
            )}
          </div>
        </section>

        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            直エール送信履歴
          </h2>
          <div className="h-80 overflow-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="sticky top-0 bg-surface text-left text-muted">
                  <th className="pb-2 font-medium">対象</th>
                  <th className="pb-2 font-medium">枚数</th>
                  <th className="pb-2 font-medium">日時</th>
                </tr>
              </thead>
              <tbody>
                {(donations ?? []).map((donation) => {
                  const href = donation.player_id
                    ? `/players/${donation.player_id}`
                    : donation.team_id
                      ? `/teams/${donation.team_id}`
                      : null;
                  const targetName = donation.player_id
                    ? (playerNameById.get(donation.player_id) ?? "-")
                    : (teamNameById.get(donation.team_id ?? "") ?? "-");
                  return (
                    <tr key={donation.id} className="border-t border-border">
                      <td className="py-2 text-foreground">
                        {href ? (
                          <Link href={href} className="hover:underline">
                            {targetName}
                          </Link>
                        ) : (
                          targetName
                        )}
                      </td>
                      <td className="py-2 text-foreground">
                        {donation.amount} EC
                      </td>
                      <td className="py-2 text-xs text-muted">
                        {new Date(donation.created_at).toLocaleString("ja-JP")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(donations ?? []).length === 0 && (
              <p className="text-sm text-muted">
                直エールの送信履歴はまだありません
              </p>
            )}
          </div>
        </section>

        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            コイン増減履歴
          </h2>
          <div className="h-80 overflow-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="sticky top-0 bg-surface text-left text-muted">
                  <th className="pb-2 font-medium">種別</th>
                  <th className="pb-2 font-medium">増減</th>
                  <th className="pb-2 font-medium">日時</th>
                </tr>
              </thead>
              <tbody>
                {(coinLogs ?? []).map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="py-2 text-foreground">
                      {COIN_LOG_TYPE_LABEL[log.type] ?? log.type}
                    </td>
                    <td
                      className={`py-2 font-semibold ${
                        log.amount >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {log.amount >= 0 ? "+" : ""}
                      {log.amount} EC
                    </td>
                    <td className="py-2 text-xs text-muted">
                      {new Date(log.created_at).toLocaleString("ja-JP")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(coinLogs ?? []).length === 0 && (
              <p className="text-sm text-muted">履歴はまだありません</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
