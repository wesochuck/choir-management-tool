

export interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const classNames = ['w-full h-2 bg-border rounded overflow-hidden'];
  if (className) classNames.push(className);

  return (
    <div
      className={classNames.join(' ')}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded bg-primary transition-[width] duration-300 ease-[ease]"
        // @allow-inline-style - dynamic width from value prop
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
