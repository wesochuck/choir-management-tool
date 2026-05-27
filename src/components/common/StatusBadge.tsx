import React from 'react';
import type { DisplayTone } from '../../lib/statusDisplay';

interface StatusBadgeProps {
  label: string;
  tone: DisplayTone;
  size?: 'sm' | 'md';
}

const toneStyles: Record<DisplayTone, React.CSSProperties> = {
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
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#1d4ed8',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
};

const sizeStyles: Record<NonNullable<StatusBadgeProps['size']>, React.CSSProperties> = {
  sm: {
    padding: '2px 6px',
    fontSize: '10px',
  },
  md: {
    padding: '4px 8px',
    fontSize: '11px',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone, size = 'md' }) => (
  <span
    style={{
      borderRadius: 'var(--radius-sm)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      ...toneStyles[tone],
      ...sizeStyles[size],
    }}
  >
    {label}
  </span>
);
