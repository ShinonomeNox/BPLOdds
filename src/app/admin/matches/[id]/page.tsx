import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";
import { MatchStatusButtons } from "@/components/admin/match-status-buttons";
import { AddParticipantsForm } from "@/components/admin/add-participants-form";
import { AddSongForm } from "@/components/admin/add-song-form";
import { SongPanel } from "@/components/admin/song-panel";
import { BetTypeSettlePanel } from "@/components/admin/bet-type-settle-panel";

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p>管理者権限が必要です。</p>
      </main>
    );
  }

  const { id: matchId } = await params;
  const supabase = createServiceClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) {
    notFound();
  }

  const [{ data: participants }, { data: players }, { data: songs }] =
    await Promise.all([
      supabase
        .from("match_participants")
        .select("id, player_id, team_side")
        .eq("match_id", matchId),
      supabase
        .from("players")
        .select("id, name")
        .eq("game_title", match.game_title)
        .order("name"),
      supabase
        .from("tag_battle_songs")
        .select("*")
        .eq("match_id", matchId)
        .order("song_number"),
    ]);

  const matchBetTypes = await getBetTypesWithOptions(supabase, {
    matchId,
  });

  const playerNameById = new Map((players ?? []).map((p) => [p.id, p.name]));
  const participantList = (participants ?? []).map((p) => ({
    ...p,
    playerName: playerNameById.get(p.player_id) ?? p.player_id,
  }));

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold">
          {match.game_title.toUpperCase()} 試合詳細
        </h1>
        <p className="text-sm text-gray-500">
          開始: {new Date(match.start_time).toLocaleString("ja-JP")} / status:{" "}
          {match.status}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">試合ステータス</h2>
        <MatchStatusButtons matchId={match.id} currentStatus={match.status} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">出場選手</h2>
        <ul className="text-sm flex flex-col gap-1">
          {participantList.map((p) => (
            <li key={p.id}>
              [{p.team_side.toUpperCase()}] {p.playerName}
            </li>
          ))}
          {participantList.length === 0 && (
            <p className="text-gray-400">出場選手は未登録です</p>
          )}
        </ul>
        <AddParticipantsForm
          matchId={match.id}
          players={players ?? []}
          registeredPlayerIds={participantList.map((p) => p.player_id)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">試合単位のベット</h2>
        {matchBetTypes.map((betType) => (
          <BetTypeSettlePanel key={betType.id} betType={betType} />
        ))}
        {matchBetTypes.length === 0 && (
          <p className="text-sm text-gray-400">
            この対戦形式では試合単位のベットはありません（曲単位のベットのみ）
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold">曲（タッグバトル等）</h2>
        {(songs ?? []).map((song) => (
          <SongPanel
            key={song.id}
            song={song}
            participants={participantList}
          />
        ))}
        <AddSongForm
          matchId={match.id}
          participantCount={participantList.length}
        />
      </section>
    </main>
  );
}
