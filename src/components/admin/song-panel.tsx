import { createServiceClient } from "@/lib/supabase/service";
import { getBetTypesWithOptions } from "@/lib/betting/get-bet-types-with-options";
import { SongStatusButtons } from "@/components/admin/song-status-buttons";
import { SubmitResultsForm } from "@/components/admin/submit-results-form";
import { SettleTrifectaButton } from "@/components/admin/settle-trifecta-button";
import { BetTypeSettlePanel } from "@/components/admin/bet-type-settle-panel";
import type { SongStatus } from "@/types/database";

interface Participant {
  id: string;
  player_id: string;
  team_side: string;
  playerName: string;
}

interface Song {
  id: string;
  song_number: number;
  status: SongStatus;
}

export async function SongPanel({
  song,
  participants,
}: {
  song: Song;
  participants: Participant[];
}) {
  const supabase = createServiceClient();
  const betTypes = await getBetTypesWithOptions(supabase, { songId: song.id });
  const trifectaType = betTypes.find((bt) => bt.type_key === "trifecta");
  const otherTypes = betTypes.filter((bt) => bt.type_key !== "trifecta");

  const { data: results } = await supabase
    .from("song_results")
    .select("participant_id, rank, raw_score")
    .eq("song_id", song.id);

  return (
    <div className="rounded border p-4 flex flex-col gap-3">
      <p className="font-medium">
        曲{song.song_number}（status: {song.status}）
      </p>
      <SongStatusButtons songId={song.id} currentStatus={song.status} />

      <SubmitResultsForm
        songId={song.id}
        participants={participants.map((p) => ({
          id: p.id,
          playerName: p.playerName,
        }))}
        existingResults={results ?? []}
      />

      {trifectaType && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            3連単（{trifectaType.options.length}択）
          </p>
          <SettleTrifectaButton songId={song.id} />
        </div>
      )}

      {otherTypes.map((betType) => (
        <BetTypeSettlePanel key={betType.id} betType={betType} />
      ))}
    </div>
  );
}
