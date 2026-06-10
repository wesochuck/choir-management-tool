import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const classNames = [styles.track];
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
        className={styles.fill}
        // @allow-inline-style - dynamic width from value prop
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
