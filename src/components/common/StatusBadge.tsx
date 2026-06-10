import React from 'react';
import type { DisplayTone } from '../../lib/statusDisplay';

interface StatusBadgeProps {
  label: string;
  tone: DisplayTone;
  size?: 'sm' | 'md';
}

const toneClasses: Record<DisplayTone, string> = {
  success: 'bg-success-bg text-success-text',
  danger: 'bg-danger-bg text-danger-text',
  warning: 'bg-amber-100 text-amber-800',
  muted: 'bg-gray-500/10 text-gray-600 border border-gray-500/20',
  primary: 'bg-primary-light text-primary-deep',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone, size = 'md' }) => (
  <span
    className={`inline-flex items-center rounded font-semibold tracking-wider uppercase ${toneClasses[tone]} ${
      size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
    }`}
  >
    {label}
  </span>
);
