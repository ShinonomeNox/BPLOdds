import type { MatchStatus, SongStatus } from "@/types/database";

export interface BetTypeTargetStatuses {
  matchStatus?: MatchStatus | null;
  roundStatus?: MatchStatus | null;
  songStatus?: SongStatus | null;
}

// bet_typesはmatch_id/round_id/song_idのいずれか1つだけを持つため、
// 対応するstatusのみが渡される想定。どれも渡されない場合は安全側に倒し締切扱いにする。
export function isBetTypeOpen(statuses: BetTypeTargetStatuses): boolean {
  if (statuses.matchStatus != null) return statuses.matchStatus === "scheduled";
  if (statuses.roundStatus != null) return statuses.roundStatus === "scheduled";
  if (statuses.songStatus != null) return statuses.songStatus === "open";
  return false;
}
