export function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-kept"
      : value >= 60
        ? "bg-amber-500"
        : "bg-reverted";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-alt">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-mono tabular-nums">{value}</span>
    </div>
  );
}
