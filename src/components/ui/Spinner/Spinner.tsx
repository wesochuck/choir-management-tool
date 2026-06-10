import './Spinner.css';

export interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Spinner({ size = 'medium', className }: SpinnerProps) {
  const classes = ['spinner', `spinner--${size}`, className].filter(Boolean).join(' ');
  return (
    <div className={classes} role="status" aria-label="Loading" />
  );
}
