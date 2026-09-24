import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DonateForm } from "@/components/donate-form";

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
    supabase.from("teams").select("name").eq("id", player.team_id).single(),
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
    <main className="flex-1 p-8 max-w-lg mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">{player.name}</h1>
        <p className="text-sm text-gray-500">
          {team?.name} / {player.game_title.toUpperCase()}
        </p>
      </div>

      <p className="text-lg">
        エールポイント:{" "}
        <span className="font-semibold">
          {(yellPoints?.total_points ?? 0).toLocaleString("ja-JP")} pt
        </span>
      </p>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">直エールを送る</p>
        <DonateForm playerId={player.id} isLoggedIn={!!user} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">今シーズンの通算成績</h2>
        {seasonStats && seasonStats.songs_played > 0 ? (
          <ul className="text-sm">
            <li>出場曲数: {seasonStats.songs_played}</li>
            <li>1位回数: {seasonStats.first_place_count}</li>
            <li>
              平均スコア:{" "}
              {seasonStats.avg_raw_score !== null
                ? Number(seasonStats.avg_raw_score).toFixed(1)
                : "-"}
            </li>
            <li>ベストスコア: {seasonStats.best_score ?? "-"}</li>
          </ul>
        ) : (
          <p className="text-sm text-gray-400">まだ出場データがありません</p>
        )}
      </section>

      {(themeStats ?? []).length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">テーマ別成績</h2>
          <ul className="text-sm">
            {(themeStats ?? []).map((stat) => (
              <li key={stat.theme}>
                {stat.theme ?? "（未分類）"}: {stat.wins}勝 / {stat.plays}戦
              </li>
            ))}
          </ul>
        </section>
      )}

      {(legacyStats ?? []).length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">前シーズン以前の成績</h2>
          <ul className="text-sm">
            {(legacyStats ?? []).map((stat) => (
              <li key={stat.id}>
                {stat.season} /{" "}
                {stat.category_type === "theme" ? "テーマ" : "レベル"}:{" "}
                {stat.category_value} — {stat.wins}勝 / {stat.plays}戦
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
