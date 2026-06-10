import React from 'react';
import styles from './Spinner.module.css';

export type SpinnerSize = 'small' | 'medium' | 'large';

export function Spinner({
  size = 'medium',
  className,
}: {
  size?: SpinnerSize;
  className?: string;
}) {
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
