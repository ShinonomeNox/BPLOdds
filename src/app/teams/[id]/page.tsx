import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DonateTeamForm } from "@/components/donate-team-form";
import { STRATEGY_CARD_LIMIT_PER_TEAM } from "@/lib/betting/strategy-cards";
import { StatusBadge } from "@/components/status-badge";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, game_title, color")
    .eq("id", id)
    .maybeSingle();

  if (!team) {
    notFound();
  }

  const [
    { data: yellPoints },
    { data: players },
    { data: cardUsages },
    { data: teamMatches },
    user,
  ] = await Promise.all([
    supabase
      .from("team_yell_points")
      .select("total_points")
      .eq("team_id", id)
      .maybeSingle(),
    supabase
      .from("players")
      .select("id, name")
      .eq("team_id", id)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase
      .from("strategy_card_usages")
      .select("id, match_id, round_label, note")
      .eq("team_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("matches")
      .select("id, team_a_id, team_b_id, status, start_time, winner_team_id")
      .or(`team_a_id.eq.${id},team_b_id.eq.${id}`)
      .order("start_time", { ascending: false }),
    getCurrentUser(),
  ]);

  const cardUsageMatchIds = [
    ...new Set((cardUsages ?? []).map((u) => u.match_id)),
  ];
  const { data: cardUsageMatches } =
    cardUsageMatchIds.length > 0
      ? await supabase
          .from("matches")
          .select("id, team_a_id, team_b_id, start_time")
          .in("id", cardUsageMatchIds)
      : { data: [] };

  const opponentTeamIds = [
    ...new Set(
      [
        ...(cardUsageMatches ?? []).flatMap((m) => [m.team_a_id, m.team_b_id]),
        ...(teamMatches ?? []).flatMap((m) => [m.team_a_id, m.team_b_id]),
      ],
    ),
  ].filter((teamId) => teamId !== id);
  const { data: opponentTeams } =
    opponentTeamIds.length > 0
      ? await supabase.from("teams").select("id, name").in("id", opponentTeamIds)
      : { data: [] };

  const opponentNameById = new Map(
    (opponentTeams ?? []).map((t) => [t.id, t.name]),
  );
  const cardUsageMatchById = new Map(
    (cardUsageMatches ?? []).map((m) => [m.id, m]),
  );

  const settledMatches = (teamMatches ?? []).filter(
    (m) => m.status === "settled" && m.winner_team_id,
  );
  const wins = settledMatches.filter((m) => m.winner_team_id === id).length;
  const losses = settledMatches.length - wins;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="card-surface relative mb-6 overflow-hidden text-center">
        <div
          className="px-6 py-8 sm:px-8 sm:py-10"
          style={{
            backgroundColor: team.color ?? "var(--surface-hover)",
          }}
        >
          <h1 className="text-2xl font-extrabold text-white drop-shadow-sm sm:text-3xl">
            {team.name}
          </h1>
          <p className="mt-1 text-sm font-semibold text-white/80">
            {team.game_title.toUpperCase()}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 p-6 sm:p-8">
          <p className="text-sm text-muted">
            エールポイント
            <br />
            <span
              className="text-3xl font-extrabold text-accent-cyan"
              style={team.color ? { color: team.color } : undefined}
            >
              {(yellPoints?.total_points ?? 0).toLocaleString("ja-JP")}
            </span>{" "}
            pt
          </p>

          <DonateTeamForm teamId={team.id} isLoggedIn={!!user} />
        </div>
      </div>

      <section className="card-surface mb-6 p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
          戦績
        </h2>
        <p className="mb-3 text-lg font-bold text-foreground">
          {wins}勝{losses}敗
          <span className="ml-2 text-sm font-normal text-muted">
            （消化試合数 {settledMatches.length}）
          </span>
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {(teamMatches ?? []).map((match) => {
            const opponentId =
              match.team_a_id === id ? match.team_b_id : match.team_a_id;
            const result =
              match.status === "settled" && match.winner_team_id
                ? match.winner_team_id === id
                  ? "win"
                  : "lose"
                : null;
            return (
              <li
                key={match.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <Link
                  href={`/matches/${match.id}`}
                  className="text-foreground underline decoration-accent-cyan/50 hover:text-accent-cyan"
                >
                  vs {opponentNameById.get(opponentId) ?? "?"}
                </Link>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    {new Date(match.start_time).toLocaleDateString("ja-JP")}
                  </span>
                  {result === "win" && (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                      勝ち
                    </span>
                  )}
                  {result === "lose" && (
                    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">
                      負け
                    </span>
                  )}
                  {result === null && <StatusBadge status={match.status} />}
                </span>
              </li>
            );
          })}
          {(teamMatches ?? []).length === 0 && (
            <p className="text-sm text-muted">対戦履歴はありません</p>
          )}
        </ul>
      </section>

      <section className="card-surface mb-6 p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
          ストラテジーカード
        </h2>
        <p className="mb-3 text-sm text-foreground">
          残り {Math.max(STRATEGY_CARD_LIMIT_PER_TEAM - (cardUsages ?? []).length, 0)}/
          {STRATEGY_CARD_LIMIT_PER_TEAM}枚
        </p>
        <ul className="flex flex-col gap-1 text-sm text-muted">
          {(cardUsages ?? []).map((usage) => {
            const match = cardUsageMatchById.get(usage.match_id);
            const opponentId = match
              ? match.team_a_id === id
                ? match.team_b_id
                : match.team_a_id
              : null;
            return (
              <li key={usage.id}>
                {match && (
                  <Link
                    href={`/matches/${match.id}`}
                    className="underline decoration-accent-cyan/50 hover:text-accent-cyan"
                  >
                    vs {opponentId ? (opponentNameById.get(opponentId) ?? "?") : "?"}
                  </Link>
                )}{" "}
                （{usage.round_label}）{usage.note && ` / ${usage.note}`}
              </li>
            );
          })}
          {(cardUsages ?? []).length === 0 && (
            <p className="text-sm text-muted">使用履歴はありません</p>
          )}
        </ul>
      </section>

      {(players ?? []).length > 0 && (
        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            所属選手
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(players ?? []).map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="rounded-lg border border-border px-3 py-2 text-center text-sm text-foreground transition-colors hover:border-accent-cyan hover:text-accent-cyan"
              >
                {player.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
