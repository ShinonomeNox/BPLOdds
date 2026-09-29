interface TeamHeaderInfo {
  id: string;
  name: string;
  color: string | null;
}

export function MatchTeamHeader({
  teamA,
  teamB,
  size = "lg",
}: {
  teamA: TeamHeaderInfo;
  teamB: TeamHeaderInfo;
  size?: "sm" | "lg";
}) {
  const colorA = teamA.color ?? "var(--team-color-fallback)";
  const colorB = teamB.color ?? "var(--team-color-fallback)";
  const nameClass =
    size === "lg" ? "text-lg font-bold sm:text-xl" : "text-sm font-semibold";

  return (
    <div className="flex items-stretch overflow-hidden rounded-lg">
      <div
        className="flex flex-1 items-center justify-end px-3 py-2 text-right"
        style={{ backgroundColor: colorA }}
      >
        <span className={`${nameClass} text-white drop-shadow-sm`}>
          {teamA.name}
        </span>
      </div>
      <div className="flex items-center bg-background px-2 text-xs font-bold text-muted">
        VS
      </div>
      <div
        className="flex flex-1 items-center justify-start px-3 py-2 text-left"
        style={{ backgroundColor: colorB }}
      >
        <span className={`${nameClass} text-white drop-shadow-sm`}>
          {teamB.name}
        </span>
      </div>
    </div>
  );
}
