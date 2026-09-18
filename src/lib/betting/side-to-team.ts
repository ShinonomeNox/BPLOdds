import type { TeamSide } from "@/types/database";

export function resolveTeamIdBySide(
  side: TeamSide | null,
  teamAId: string,
  teamBId: string,
): string | null {
  if (side === "a") {
    return teamAId;
  }
  if (side === "b") {
    return teamBId;
  }
  return null;
}
