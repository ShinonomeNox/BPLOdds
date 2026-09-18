import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DonateTeamForm } from "@/components/donate-team-form";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, game_title")
    .eq("id", id)
    .maybeSingle();

  if (!team) {
    notFound();
  }

  const [{ data: yellPoints }, user] = await Promise.all([
    supabase
      .from("team_yell_points")
      .select("total_points")
      .eq("team_id", id)
      .maybeSingle(),
    getCurrentUser(),
  ]);

  return (
    <main className="flex-1 p-8 max-w-lg mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">{team.name}</h1>
        <p className="text-sm text-gray-500">
          {team.game_title.toUpperCase()}
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
        <DonateTeamForm teamId={team.id} isLoggedIn={!!user} />
      </div>
    </main>
  );
}
