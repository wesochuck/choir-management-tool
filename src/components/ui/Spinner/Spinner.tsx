import styles from './Spinner.module.css';

export type SpinnerSize = 'small' | 'medium' | 'large';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({
  size = 'medium',
  className,
}: SpinnerProps) {
  const classNames = [styles.spinner, styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      role="status"
      aria-label="Loading"
    />
  );
}
