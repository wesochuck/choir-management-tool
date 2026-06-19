export interface CheckIconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export function CheckIcon({
  className = 'size-4',
  'aria-hidden': ariaHidden = true,
}: CheckIconProps) {
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
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
