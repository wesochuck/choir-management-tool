export interface MusicalNoteIconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export function MusicalNoteIcon({
  className = 'size-4',
  'aria-hidden': ariaHidden = true,
}: MusicalNoteIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
