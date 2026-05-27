import type { CSSProperties } from 'react';
import type { DisplayTone } from '../../lib/statusDisplay';

export interface StatusBadgeProps {
  label: string;
  tone: DisplayTone;
  size?: 'sm' | 'md';
}

const toneStyles: Record<DisplayTone, CSSProperties> = {
  success: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#15803d',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#b91c1c',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#b45309',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  muted: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    color: '#4b5563',
    border: '1px solid rgba(107, 114, 128, 0.2)',
  },
  primary: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    color: '#1d4ed8',
    border: '1px solid rgba(59, 130, 246, 0.24)',
  },
};

export function StatusBadge({ label, tone, size = 'sm' }: StatusBadgeProps) {
  const sizeStyles: CSSProperties = size === 'md'
    ? { padding: '6px 10px', fontSize: '12px' }
    : { padding: '4px 8px', fontSize: '11px' };

  return (
    <span
      style={{
        ...sizeStyles,
        ...toneStyles[tone],
        borderRadius: 'var(--radius-sm)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
}
