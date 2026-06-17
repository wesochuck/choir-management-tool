import type { ReactNode } from 'react';
import SlCopyButton from '@shoelace-style/shoelace/dist/react/copy-button/index.js';
import { safeSlProps } from '../shared';

export interface CopyButtonProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function CopyButton({ value, disabled, className, children }: CopyButtonProps) {
  if (process.env.NODE_ENV === 'test') {
    return (
      <button
        type="button"
        className={className}
        disabled={disabled}
        onClick={() => navigator.clipboard.writeText(value)}
      >
        {children}
      </button>
    );
  }

  return (
    <SlCopyButton {...safeSlProps({ value, disabled, className } as Record<string, unknown>)}>
      {children}
    </SlCopyButton>
  );
}
