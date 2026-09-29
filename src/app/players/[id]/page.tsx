import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DonateForm } from "@/components/donate-form";
import { BackButton } from "@/components/back-button";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: player } = await supabase
    .from("players")
    .select("id, name, game_title, team_id")
    .eq("id", id)
    .maybeSingle();

  if (!player) {
    notFound();
  }

  const [
    { data: team },
    { data: yellPoints },
    { data: seasonStats },
    { data: themeStats },
    { data: legacyStats },
    user,
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("name, color")
      .eq("id", player.team_id)
      .single(),
    supabase
      .from("player_yell_points")
      .select("total_points")
      .eq("player_id", id)
      .maybeSingle(),
    supabase
      .from("player_season_stats")
      .select("*")
      .eq("player_id", id)
      .maybeSingle(),
    supabase.from("player_theme_stats").select("*").eq("player_id", id),
    supabase
      .from("player_legacy_stats")
      .select("*")
      .eq("player_id", id)
      .order("season", { ascending: false }),
    getCurrentUser(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <BackButton />

      <div className="card-surface mb-6 overflow-hidden text-center">
        <div
          className="px-6 py-8 sm:px-8 sm:py-10"
          style={{ backgroundColor: team?.color ?? "var(--team-color-fallback)" }}
        >
          <h1 className="text-2xl font-extrabold text-white drop-shadow-sm sm:text-3xl">
            {player.name}
          </h1>
          <p className="mt-1 text-sm font-semibold text-white/80">
            {team?.name} / {player.game_title.toUpperCase()}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 p-6 sm:p-8">
          <p className="text-sm text-muted">
            エールポイント
            <br />
            <span
              className="text-3xl font-extrabold text-accent-cyan"
              style={team?.color ? { color: team.color } : undefined}
            >
              {(yellPoints?.total_points ?? 0).toLocaleString("ja-JP")}
            </span>{" "}
            pt
          </p>

          <DonateForm playerId={player.id} isLoggedIn={!!user} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            今シーズンの通算成績
          </h2>
          {seasonStats && seasonStats.songs_played > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="出場曲数" value={seasonStats.songs_played} />
              <Stat label="1位回数" value={seasonStats.first_place_count} />
              <Stat
                label="平均スコア"
                value={
                  seasonStats.avg_raw_score !== null
                    ? Number(seasonStats.avg_raw_score).toFixed(1)
                    : "-"
                }
              />
              <Stat label="ベストスコア" value={seasonStats.best_score ?? "-"} />
            </div>
          ) : (
            <p className="text-sm text-muted">まだ出場データがありません</p>
          )}
        </section>

        {(themeStats ?? []).length > 0 && (
          <section className="card-surface p-5 sm:p-6">
            <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
              テーマ別成績
            </h2>
            <ul className="flex flex-col gap-1 text-sm text-foreground">
              {(themeStats ?? []).map((stat) => (
                <li
                  key={stat.theme}
                  className="flex justify-between border-b border-border py-1 last:border-b-0"
                >
                  <span>{stat.theme ?? "（未分類）"}</span>
                  <span className="text-muted">
                    {stat.wins}勝 / {stat.plays}戦
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(legacyStats ?? []).length > 0 && (
          <section className="card-surface p-5 sm:p-6">
            <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
              前シーズン以前の成績
            </h2>
            <ul className="flex flex-col gap-1 text-sm text-foreground">
              {(legacyStats ?? []).map((stat) => (
                <li
                  key={stat.id}
                  className="flex justify-between border-b border-border py-1 last:border-b-0"
                >
                  <span>
                    {stat.season} /{" "}
                    {stat.category_type === "theme" ? "テーマ" : "レベル"}:{" "}
                    {stat.category_value}
                  </span>
                  <span className="text-muted">
                    {stat.wins}勝 / {stat.plays}戦
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-xl font-extrabold text-foreground">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
