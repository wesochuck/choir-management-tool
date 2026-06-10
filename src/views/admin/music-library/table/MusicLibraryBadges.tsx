export function TrackBadge() {
  return (
    <span
      title="Has learning tracks"
      className="text-[13px] leading-none cursor-default inline-flex items-center"
    >
      🎧
    </span>
  );
}

export function MultiMovementBadge() {
  return (
    <span className="inline-flex items-center px-[6px] py-[2px] rounded-[4px] text-[10px] font-semibold leading-[1.2] border bg-[var(--primary-light)] text-[var(--primary)] border-[rgb(27_77_62_/_20%)]">
      Multi-Movement
    </span>
  );
}

export function MovementBadge() {
  return (
    <span className="inline-flex items-center px-[5px] py-[1px] rounded-[4px] text-[9px] font-medium leading-[1.2] border bg-[rgb(100_116_139_/_10%)] text-[var(--text-muted)] border-[rgb(100_116_139_/_20%)]">
      Movement
    </span>
  );
}
