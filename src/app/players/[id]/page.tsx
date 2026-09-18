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

  const [{ data: team }, { data: yellPoints }, user] = await Promise.all([
    supabase.from("teams").select("name").eq("id", player.team_id).single(),
    supabase
      .from("player_yell_points")
      .select("total_points")
      .eq("player_id", id)
      .maybeSingle(),
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
    </main>
  );
}
