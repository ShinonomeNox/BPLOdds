const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-success/15 text-success border-success/40",
  open: "bg-success/15 text-success border-success/40",
  live: "bg-danger/15 text-danger border-danger/40",
  closed: "bg-danger/15 text-danger border-danger/40",
  settled: "bg-muted/15 text-muted border-border",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "受付中",
  open: "受付中",
  live: "締切済み",
  closed: "締切済み",
  settled: "終了",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${
        STATUS_STYLES[status] ?? "border-border text-muted"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
