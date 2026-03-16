export function StatusBadge({ kept }: { kept: boolean }) {
  if (kept) {
    return (
      <span className="inline-block rounded-full bg-kept-light px-2.5 py-0.5 text-xs font-semibold text-kept">
        KEPT
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-reverted-light px-2.5 py-0.5 text-xs font-semibold text-reverted/60">
      REVERTED
    </span>
  );
}
