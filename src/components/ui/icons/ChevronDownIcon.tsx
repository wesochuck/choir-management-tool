export interface ChevronDownIconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export function ChevronDownIcon({
  className = 'size-4',
  'aria-hidden': ariaHidden = true,
}: ChevronDownIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}
