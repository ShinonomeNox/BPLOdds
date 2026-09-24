import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";
import { MatchStatusButtons } from "@/components/admin/match-status-buttons";
import { AddParticipantsForm } from "@/components/admin/add-participants-form";
import { AddSongForm } from "@/components/admin/add-song-form";
import { SongPanel } from "@/components/admin/song-panel";
import { BetTypeSettlePanel } from "@/components/admin/bet-type-settle-panel";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">管理者権限が必要です。</p>
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="card-surface mb-6 p-5 sm:p-6">
        <h1 className="text-xl font-bold text-foreground">
          {match.game_title.toUpperCase()} 試合詳細
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted">
          開始: {new Date(match.start_time).toLocaleString("ja-JP")}
          <StatusBadge status={match.status} />
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            試合ステータス
          </h2>
          <MatchStatusButtons matchId={match.id} currentStatus={match.status} />
        </section>

        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            出場選手
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {participantList.map((p) => (
              <li key={p.id} className="text-foreground">
                [{p.team_side.toUpperCase()}] {p.playerName}
              </li>
            ))}
            {participantList.length === 0 && (
              <p className="text-muted">出場選手は未登録です</p>
            )}
          </ul>
          <div className="mt-3">
            <AddParticipantsForm
              matchId={match.id}
              players={players ?? []}
              registeredPlayerIds={participantList.map((p) => p.player_id)}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-accent-purple">
            試合単位のベット
          </h2>
          {matchBetTypes.map((betType) => (
            <BetTypeSettlePanel key={betType.id} betType={betType} />
          ))}
          {matchBetTypes.length === 0 && (
            <p className="text-sm text-muted">
              この対戦形式では試合単位のベットはありません（曲単位のベットのみ）
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-wide text-accent-purple">
            曲（タッグバトル等）
          </h2>
          {(songs ?? []).map((song) => (
            <SongPanel key={song.id} song={song} participants={participantList} />
          ))}
          <AddSongForm
            matchId={match.id}
            participantCount={participantList.length}
          />
        </section>
      </div>
    </main>
  );
}
