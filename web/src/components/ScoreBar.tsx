export function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-green-500"
      : value >= 60
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-mono tabular-nums">{value}</span>
    </div>
  );
}
