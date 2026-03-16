const STRATEGY_COLORS: Record<string, string> = {
  sharpen: "bg-blue-50 text-blue-700",
  add_example: "bg-purple-50 text-purple-700",
  remove: "bg-orange-50 text-orange-700",
  restructure: "bg-teal-50 text-teal-700",
  constrain: "bg-amber-50 text-amber-700",
  expand: "bg-emerald-50 text-emerald-700",
};

export function StrategyBadge({ strategy }: { strategy: string }) {
  const colors = STRATEGY_COLORS[strategy] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}
    >
      {strategy}
    </span>
  );
}
