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
  const colorA = teamA.color ?? "var(--border)";
  const colorB = teamB.color ?? "var(--border)";
  const nameClass =
    size === "lg" ? "text-lg font-bold sm:text-xl" : "text-sm font-semibold";

  return (
    <div className="flex items-stretch overflow-hidden rounded-lg">
      <div
        className="flex flex-1 items-center justify-end px-3 py-2 text-right"
        style={{
          borderRight: `3px solid ${colorA}`,
          backgroundColor: teamA.color ? `${teamA.color}1a` : "transparent",
        }}
      >
        <span className={`${nameClass} text-foreground`}>{teamA.name}</span>
      </div>
      <div className="flex items-center px-2 text-xs font-bold text-muted">
        VS
      </div>
      <div
        className="flex flex-1 items-center justify-start px-3 py-2 text-left"
        style={{
          borderLeft: `3px solid ${colorB}`,
          backgroundColor: teamB.color ? `${teamB.color}1a` : "transparent",
        }}
      >
        <span className={`${nameClass} text-foreground`}>{teamB.name}</span>
      </div>
    </div>
  );
}
