const STRATEGY_COLORS: Record<string, string> = {
  sharpen: "bg-blue-100 text-blue-700",
  add_example: "bg-purple-100 text-purple-700",
  remove: "bg-orange-100 text-orange-700",
  restructure: "bg-teal-100 text-teal-700",
  constrain: "bg-yellow-100 text-yellow-700",
  expand: "bg-green-100 text-green-700",
};

export function StrategyBadge({ strategy }: { strategy: string }) {
  const colors = STRATEGY_COLORS[strategy] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}
    >
      {strategy}
    </span>
  );
}
