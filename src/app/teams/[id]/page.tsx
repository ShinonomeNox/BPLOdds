import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DonateTeamForm } from "@/components/donate-team-form";
import { STRATEGY_CARD_LIMIT_PER_TEAM } from "@/lib/betting/strategy-cards";
import { StatusBadge } from "@/components/status-badge";
import { BackButton } from "@/components/back-button";
import { Tabs, type TabItem } from "@/components/tabs";
import type { GameTitle } from "@/types/database";

const GAME_TITLES: GameTitle[] = ["iidx", "sdvx", "ddr"];
const GAME_TITLE_LABEL: Record<GameTitle, string> = {
  iidx: "IIDX",
  sdvx: "SDVX",
  ddr: "DDR",
};

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

  const { data: teamsInGroup } = await supabase
    .from("teams")
    .select("id, name, game_title, color")
    .eq("name", team.name);

  const sortedTeams = GAME_TITLES.map((gt) =>
    (teamsInGroup ?? []).find((t) => t.game_title === gt),
  ).filter((t): t is NonNullable<typeof t> => !!t);

  const user = await getCurrentUser();

  const sections = await Promise.all(
    sortedTeams.map(async (t) => {
      const [{ data: yellPoints }, { data: players }, { data: cardUsages }, { data: teamMatches }] =
        await Promise.all([
          supabase
            .from("team_yell_points")
            .select("total_points")
            .eq("team_id", t.id)
            .maybeSingle(),
          supabase
            .from("players")
            .select("id, name")
            .eq("team_id", t.id)
            .order("display_order", { ascending: true, nullsFirst: false })
            .order("name"),
          supabase
            .from("strategy_card_usages")
            .select("id, match_id, round_label, note")
            .eq("team_id", t.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("matches")
            .select("id, team_a_id, team_b_id, status, start_time, winner_team_id")
            .or(`team_a_id.eq.${t.id},team_b_id.eq.${t.id}`)
            .order("start_time", { ascending: false }),
        ]);

      const cardUsageMatchIds = [
        ...new Set((cardUsages ?? []).map((u) => u.match_id)),
      ];
      const { data: cardUsageMatches } =
        cardUsageMatchIds.length > 0
          ? await supabase
              .from("matches")
              .select("id, team_a_id, team_b_id")
              .in("id", cardUsageMatchIds)
          : { data: [] };

      const opponentTeamIds = [
        ...new Set(
          [
            ...(cardUsageMatches ?? []).flatMap((m) => [m.team_a_id, m.team_b_id]),
            ...(teamMatches ?? []).flatMap((m) => [m.team_a_id, m.team_b_id]),
          ],
        ),
      ].filter((teamId) => teamId !== t.id);
      const { data: opponentTeams } =
        opponentTeamIds.length > 0
          ? await supabase.from("teams").select("id, name").in("id", opponentTeamIds)
          : { data: [] };

      const opponentNameById = new Map(
        (opponentTeams ?? []).map((ot) => [ot.id, ot.name]),
      );
      const cardUsageMatchById = new Map(
        (cardUsageMatches ?? []).map((m) => [m.id, m]),
      );

      const settledMatches = (teamMatches ?? []).filter(
        (m) => m.status === "settled" && m.winner_team_id,
      );
      const wins = settledMatches.filter((m) => m.winner_team_id === t.id).length;
      const losses = settledMatches.length - wins;

      return {
        team: t,
        yellPoints,
        players: players ?? [],
        cardUsages: cardUsages ?? [],
        teamMatches: teamMatches ?? [],
        opponentNameById,
        cardUsageMatchById,
        wins,
        losses,
      };
    }),
  );

  const tabs: TabItem[] = sections.map((section) => ({
    key: section.team.id,
    label: GAME_TITLE_LABEL[section.team.game_title],
    content: (
      <>
            <div className="card-surface flex flex-col items-center gap-3 p-5 text-center sm:p-6">
              <p className="text-sm text-muted">
                エールポイント
                <br />
                <span
                  className="text-3xl font-extrabold text-accent-cyan"
                  style={section.team.color ? { color: section.team.color } : undefined}
                >
                  {(section.yellPoints?.total_points ?? 0).toLocaleString("ja-JP")}
                </span>{" "}
                pt
              </p>
              <DonateTeamForm teamId={section.team.id} isLoggedIn={!!user} />
            </div>

            <div className="card-surface p-5 sm:p-6">
              <h3 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
                戦績
              </h3>
              <p className="mb-3 text-lg font-bold text-foreground">
                {section.wins}勝{section.losses}敗
                <span className="ml-2 text-sm font-normal text-muted">
                  （消化試合数 {section.teamMatches.filter((m) => m.status === "settled" && m.winner_team_id).length}）
                </span>
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {section.teamMatches.map((match) => {
                  const opponentId =
                    match.team_a_id === section.team.id ? match.team_b_id : match.team_a_id;
                  const result =
                    match.status === "settled" && match.winner_team_id
                      ? match.winner_team_id === section.team.id
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
                        vs {section.opponentNameById.get(opponentId) ?? "?"}
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
                {section.teamMatches.length === 0 && (
                  <p className="text-sm text-muted">対戦履歴はありません</p>
                )}
              </ul>
            </div>

            <div className="card-surface p-5 sm:p-6">
              <h3 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
                ストラテジーカード
              </h3>
              <p className="mb-3 text-sm text-foreground">
                残り {Math.max(STRATEGY_CARD_LIMIT_PER_TEAM - section.cardUsages.length, 0)}/
                {STRATEGY_CARD_LIMIT_PER_TEAM}枚
              </p>
              <ul className="flex flex-col gap-1 text-sm text-muted">
                {section.cardUsages.map((usage) => {
                  const match = section.cardUsageMatchById.get(usage.match_id);
                  const opponentId = match
                    ? match.team_a_id === section.team.id
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
                          vs{" "}
                          {opponentId
                            ? (section.opponentNameById.get(opponentId) ?? "?")
                            : "?"}
                        </Link>
                      )}{" "}
                      （{usage.round_label}）{usage.note && ` / ${usage.note}`}
                    </li>
                  );
                })}
                {section.cardUsages.length === 0 && (
                  <p className="text-sm text-muted">使用履歴はありません</p>
                )}
              </ul>
            </div>

            {section.players.length > 0 && (
              <div className="card-surface p-5 sm:p-6">
                <h3 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
                  所属選手
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {section.players.map((player) => (
                    <Link
                      key={player.id}
                      href={`/players/${player.id}`}
                      className="rounded-lg border border-border px-3 py-2 text-center text-sm text-foreground transition-colors hover:border-accent-cyan hover:text-accent-cyan"
                    >
                      {player.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
      </>
    ),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <BackButton />

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
        </div>
      </div>

      <Tabs tabs={tabs} />
    </main>
  );
}
