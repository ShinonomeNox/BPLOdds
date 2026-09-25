"use client";

export function AmountInput({
  value,
  onChange,
  min = 10,
  step = 10,
  quickAdd = [10, 100],
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  step?: number;
  quickAdd?: number[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-base w-24"
      />
      <span className="text-xs text-muted">EC</span>
      {quickAdd.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onChange(value + q)}
          className="btn-secondary px-2 py-1 text-xs"
        >
          +{q}
        </button>
      ))}
    </div>
  );
}
