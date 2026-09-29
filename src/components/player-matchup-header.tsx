interface PlayerMatchupHeaderProps {
  aName: string;
  aName2?: string | null;
  aColor: string | null;
  bName: string;
  bName2?: string | null;
  bColor: string | null;
  centerLabel?: string;
  onClick?: () => void;
}

export function PlayerMatchupHeader({
  aName,
  aName2,
  aColor,
  bName,
  bName2,
  bColor,
  centerLabel,
  onClick,
}: PlayerMatchupHeaderProps) {
  const content = (
    <>
      <div
        className="flex flex-1 items-center justify-end truncate px-3 py-2 text-right text-sm font-semibold text-white"
        style={{ backgroundColor: aColor ?? "var(--team-color-fallback)" }}
      >
        {aName}
        {aName2 && ` / ${aName2}`}
      </div>
      {centerLabel && (
        <div className="flex shrink-0 items-center bg-background px-2 text-xs font-bold text-muted">
          {centerLabel}
        </div>
      )}
      <div
        className="flex flex-1 items-center justify-start truncate px-3 py-2 text-left text-sm font-semibold text-white"
        style={{ backgroundColor: bColor ?? "var(--team-color-fallback)" }}
      >
        {bName}
        {bName2 && ` / ${bName2}`}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-stretch overflow-hidden rounded-lg transition-transform hover:scale-[1.01]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-stretch overflow-hidden rounded-lg">{content}</div>
  );
}
