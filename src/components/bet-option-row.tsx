interface BetOptionRowProps {
  optionId: string;
  label: string;
  subLabel?: string | null;
  odds: number | null;
  myBetAmount: number | null;
  groupName: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  accentColor?: string | null;
  isSettled?: boolean;
  isWinner?: boolean;
}

export function BetOptionRow({
  label,
  subLabel,
  odds,
  myBetAmount,
  groupName,
  selected,
  disabled,
  onSelect,
  accentColor,
  isSettled = false,
  isWinner = false,
}: BetOptionRowProps) {
  const hasCustomColor = !!accentColor;
  return (
    <label
      className={`flex cursor-pointer flex-col gap-1.5 rounded-lg border-2 px-3 py-2 text-sm transition-all ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      } ${hasCustomColor ? "" : "text-foreground"} ${
        isSettled && isWinner ? "ring-2 ring-success" : ""
      } ${isSettled && !isWinner ? "opacity-50" : ""}`}
      style={
        hasCustomColor
          ? {
              backgroundColor: accentColor!,
              borderColor: selected ? "#ffffff" : accentColor!,
              color: "#ffffff",
            }
          : {
              backgroundColor: selected
                ? "var(--accent-cyan)"
                : "var(--surface-hover)",
              borderColor: selected ? "#ffffff" : "var(--border)",
              color: selected ? "#ffffff" : "var(--foreground)",
            }
      }
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <input
            type="radio"
            name={groupName}
            checked={selected}
            disabled={disabled}
            onChange={onSelect}
          />
          <span className="font-semibold">
            {isSettled && isWinner && "🏆 "}
            {label}
          </span>
        </span>
        <span className="shrink-0 text-xs font-bold">
          {isSettled
            ? isWinner
              ? odds !== null
                ? `確定×${odds.toFixed(1)}`
                : "的中"
              : "対象外"
            : odds !== null
              ? `×${odds.toFixed(1)}`
              : "未賭け"}
        </span>
      </span>
      {subLabel && <span className="pl-6 text-xs opacity-85">{subLabel}</span>}
      <span className="self-start rounded-full bg-black/25 px-2 py-0.5 text-xs font-semibold">
        あなたのエール: {(myBetAmount ?? 0).toLocaleString("ja-JP")} EC
      </span>
    </label>
  );
}
