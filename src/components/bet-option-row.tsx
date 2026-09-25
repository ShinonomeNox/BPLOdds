interface BetOptionRowProps {
  optionId: string;
  label: string;
  odds: number | null;
  myBetAmount: number | null;
  groupName: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export function BetOptionRow({
  label,
  odds,
  myBetAmount,
  groupName,
  selected,
  disabled,
  onSelect,
}: BetOptionRowProps) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
        selected
          ? "border-accent-cyan bg-accent-cyan/10"
          : "border-border hover:border-accent-cyan/50"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span className="flex items-center gap-2">
        <input
          type="radio"
          name={groupName}
          checked={selected}
          disabled={disabled}
          onChange={onSelect}
          className="accent-[var(--accent-cyan)]"
        />
        <span className="text-foreground">{label}</span>
        {myBetAmount !== null && (
          <span className="rounded-full bg-accent-purple/15 px-2 py-0.5 text-xs font-semibold text-accent-purple">
            あなたの賭け: {myBetAmount.toLocaleString("ja-JP")} EC
          </span>
        )}
      </span>
      <span className="shrink-0 text-xs font-bold text-accent-cyan">
        {odds !== null ? `×${odds.toFixed(1)}` : "未賭け"}
      </span>
    </label>
  );
}
