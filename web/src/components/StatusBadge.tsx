export function StatusBadge({ kept }: { kept: boolean }) {
  if (kept) {
    return (
      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        KEPT
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-400">
      REVERTED
    </span>
  );
}
