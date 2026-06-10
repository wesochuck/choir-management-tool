export type SpinnerSize = 'small' | 'medium' | 'large';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  small: 'w-3.5 h-3.5 border-2',
  medium: 'w-6 h-6 border-3',
  large: 'w-9 h-9 border-4',
};

export function Spinner({ size = 'medium', className }: SpinnerProps) {
  const classNames = [
    'inline-block rounded-full animate-spin',
    'border-border border-t-primary',
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames} role="status" aria-label="Loading" />;
}
