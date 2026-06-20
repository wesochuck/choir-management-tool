import SlSpinner from '@shoelace-style/shoelace/dist/react/spinner/index.js';
import { safeSlProps } from '../shared';

export type SpinnerSize = 'small' | 'medium' | 'large';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeFontSizes: Record<SpinnerSize, string> = {
  small: '0.875rem',
  medium: '1.5rem',
  large: '2.25rem',
};

const sizeClasses: Record<SpinnerSize, string> = {
  small: 'w-3.5 h-3.5 border-2',
  medium: 'w-6 h-6 border-3',
  large: 'w-9 h-9 border-4',
};

export function Spinner({ size = 'medium', className }: SpinnerProps) {
  if (process.env.NODE_ENV === 'test') {
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

  return (
    <SlSpinner
      {...safeSlProps({ className } as Record<string, unknown>)}
      role="status"
      aria-label="Loading"
      // @allow-inline-style - dynamic spinner sizes
      style={
        {
          fontSize: sizeFontSizes[size],
          '--track-width': size === 'small' ? '2px' : size === 'medium' ? '3px' : '4px',
          display: 'inline-block',
        } as React.CSSProperties
      }
    />
  );
}
